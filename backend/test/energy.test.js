import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mean, percentChange, sum, toNumber } from '../src/services/energyMath.js';
import { EnergyService, SHIFT_HOURS } from '../src/services/EnergyService.js';

describe('Модуль energyMath.js (расчётные функции)', () => {
  it('сумма и среднее пропускают отсутствующие значения', () => {
    assert.equal(sum([1, null, 2]), 3);
    assert.equal(sum([null]), null);
    assert.equal(mean([2, null, 4]), 3);
    assert.equal(mean([]), null);
  });

  it('изменение в процентах не определено без данных или при нулевой базе', () => {
    assert.equal(percentChange(110, 100), 10);
    assert.equal(percentChange(90, 100), -10);
    assert.equal(percentChange(5, 0), null);
    assert.equal(percentChange(null, 100), null);
  });

  it('toNumber переводит строки PostgreSQL NUMERIC в числа', () => {
    assert.equal(toNumber('185.40'), 185.4);
    assert.equal(toNumber(null), null);
  });
});

describe('Класс EnergyService (энергоэффективность)', () => {
  const readings = {
    aggregateByShift: async () => [
      { furnace_id: 1, furnace_name: 'Печь №1', fuel: '180', electricity: '44', output_tph: '30', prev_fuel: '200', prev_electricity: '44', prev_output_tph: '25' },
      { furnace_id: 2, furnace_name: 'Печь №2', fuel: '190', electricity: '46', output_tph: '30', prev_fuel: null, prev_electricity: null, prev_output_tph: null },
    ],
    hourlyFuel: async () => [{ hour: '2026-10-22T10:00:00Z', fuel: '185.5' }],
  };

  it('считает показатели завода: топливо и электроэнергия – среднее, выпуск – сумма за смену', async () => {
    const report = await new EnergyService({ readings }).getReport();
    assert.equal(report.totals.fuel, 185);
    assert.equal(report.totals.electricity, 45);
    assert.equal(report.totals.production, 2 * 30 * SHIFT_HOURS);
    assert.equal(report.furnaces[0].production, 240);
    assert.deepEqual(report.hourly, [{ hour: '2026-10-22T10:00:00Z', fuel: 185.5 }]);
  });

  it('сравнивает с предыдущей сменой и не учитывает печь без истории', async () => {
    const { changes } = await new EnergyService({ readings }).getReport();
    assert.equal(changes.fuel, (185 - 200) / 200 * 100);
    assert.equal(changes.electricity, 2.272727272727273);
    assert.equal(changes.production, 140);
  });
});
