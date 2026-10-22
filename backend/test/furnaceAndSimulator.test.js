import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FurnaceService } from '../src/services/FurnaceService.js';
import { DEFAULT_PROFILES, SensorSimulator } from '../src/services/SensorSimulator.js';
import { NotFoundError } from '../src/errors.js';

describe('Класс FurnaceService (состояние печи и показания)', () => {
  const periods = [];
  const service = new FurnaceService({
    furnaces: {
      findCurrentState: async (id) => (id === 1 ? { furnace_id: 1, operator_name: 'Иванов И.В.' } : null),
      exists: async (id) => id === 1,
    },
    readings: {
      findForFurnace: async (id, hours) => {
        periods.push(hours);
        return [{ reading_time: 't', temperature: '1447.10', pressure: '-2.35', fuel_consumption: '185.40', o2_percent: '3.20', cao_pct: '64.2', sio2_pct: '20.1', al2o3_pct: null }];
      },
    },
  });

  it('возвращает текущее состояние печи или 404', async () => {
    assert.equal((await service.getCurrentState(1)).operator_name, 'Иванов И.В.');
    await assert.rejects(service.getCurrentState(9), NotFoundError);
  });

  it('переводит показания в числа и ограничивает период от 1 до 168 часов', async () => {
    const [r] = await service.getReadings(1, 2);
    assert.equal(r.temperature, 1447.1);
    assert.equal(r.al2o3_pct, null);
    await service.getReadings(1, 1000);
    await service.getReadings(1, 0);
    await service.getReadings(1);
    assert.deepEqual(periods, [2, 168, 24, 24]);
    await assert.rejects(service.getReadings(9), /Печь не найдена/);
  });
});

describe('Класс SensorSimulator (симулятор датчиков)', () => {
  const now = new Date('2026-10-22T12:00:00Z');
  const fakeReadings = (latest = null) => {
    const inserted = [];
    let deleted = null;
    return {
      inserted,
      get deleted() { return deleted; },
      findLatest: async () => latest,
      insert: async (furnaceId, time, values) => inserted.push({ furnaceId, time, values }),
      deleteOlderThan: async (days) => { deleted = days; },
    };
  };

  it('следующее значение стремится к базовому режиму печи', () => {
    const sim = new SensorSimulator({ readings: fakeReadings(), random: () => 0.5 });
    const base = DEFAULT_PROFILES[1];
    const next = sim.next({ ...base, temperature: base.temperature + 100 }, base);
    assert.equal(next.temperature, base.temperature + 80);
    assert.equal(next.fuel_consumption, base.fuel_consumption);
  });

  it('без истории достраивает показания за сутки с шагом 30 минут для каждой печи', async () => {
    const readings = fakeReadings();
    const added = await new SensorSimulator({ readings, now: () => now, random: () => 0.5 }).fillHistory();
    assert.equal(added, 49 * 4);
    assert.equal(readings.inserted.at(-1).time.getTime(), now.getTime());
  });

  it('при свежих показаниях история не дописывается', async () => {
    const readings = fakeReadings({ reading_time: now.toISOString(), temperature: '1450' });
    assert.equal(await new SensorSimulator({ readings, now: () => now }).fillHistory(), 0);
  });

  it('такт добавляет показание каждой печи и удаляет данные старше 7 дней', async () => {
    const readings = fakeReadings({ reading_time: now.toISOString(), temperature: '1450', pressure: null });
    await new SensorSimulator({ readings, now: () => now, random: () => 0.5 }).tick();
    assert.equal(readings.inserted.length, 4);
    assert.equal(readings.inserted[0].values.pressure, DEFAULT_PROFILES[1].pressure);
    assert.equal(readings.deleted, 7);
  });

  it('запускается по таймеру и останавливается', async () => {
    const readings = fakeReadings();
    const sim = new SensorSimulator({ readings, intervalMs: 5, now: () => now });
    sim.start();
    await new Promise((r) => setTimeout(r, 40));
    sim.stop();
    const count = readings.inserted.length;
    assert.ok(count >= 4);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(readings.inserted.length, count);
    assert.equal(sim.timer, null);
  });
});
