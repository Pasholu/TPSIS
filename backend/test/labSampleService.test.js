import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LabSampleService } from '../src/services/LabSampleService.js';
import { ToleranceService } from '../src/services/ToleranceService.js';
import { NotFoundError, ValidationError } from '../src/errors.js';
import { parseCreateLabSample, toLabSampleDto } from '../src/dto/labSampleDto.js';

// Поддельные хранилища в памяти: сервис получает их через конструктор вместо PostgreSQL.
const makeService = ({ furnaceIds = [1], gradeIds = [3], existingTask = null, tolerances = [] } = {}) => {
  const state = { samples: [], tasks: existingTask ? [existingTask] : [], codes: [], transactions: 0 };
  const deps = {
    db: { transaction: (work) => { state.transactions += 1; return work('tx'); } },
    furnaces: { exists: async (id) => furnaceIds.includes(id) },
    grades: { exists: async (id) => gradeIds.includes(id) },
    tasks: {
      findLatestFor: async (f, g) => state.tasks.find((t) => t.furnace_id === f && t.grade_id === g) ?? null,
      createActive: async (f, g) => {
        const task = { task_id: 100 + state.tasks.length, furnace_id: f, grade_id: g };
        state.tasks.push(task);
        return task;
      },
    },
    samples: {
      create: async (data) => {
        const row = { sample_id: state.samples.length + 1, sample_code: data.code, ...data };
        state.samples.push(row);
        return row;
      },
      assignGeneratedCode: async (id) => state.codes.push(id),
      findDetailedById: async (id) => {
        const s = state.samples.find((x) => x.sample_id === id);
        return s && { ...s, cao_pct: String(s.cao), mgo_pct: String(s.mgo), sample_time: '2026-10-22T10:00:00Z' };
      },
      findAllDetailed: async () => state.samples.map((s) => ({ ...s, cao_pct: String(s.cao), mgo_pct: String(s.mgo) })),
      deleteById: async (id) => state.samples.some((x) => x.sample_id === id),
    },
    tolerances: new ToleranceService({ referenceItems: { findByCategory: async () => tolerances } }),
  };
  return { service: new LabSampleService(deps), state };
};

const input = (over = {}) => ({ furnaceId: 1, gradeId: 3, cao: 64, mgo: 1.1, code: 'TST-1', notes: null, ...over });

describe('Класс LabSampleService (лабораторные пробы)', () => {
  it('проба в пределах допусков получает признак «годна»', async () => {
    const { service } = makeService();
    const sample = await service.register(input());
    assert.equal(sample.passed, true);
    assert.equal(sample.cao_pct, 64);
  });

  it('проба вне допуска получает признак «брак»', async () => {
    const { service } = makeService();
    assert.equal((await service.register(input({ cao: 50 }))).passed, false);
    assert.equal((await service.register(input({ code: 'TST-2', mgo: 3 }))).passed, false);
  });

  it('допуски берутся из справочника, а не только по умолчанию', async () => {
    const { service } = makeService({ tolerances: [{ name: 'CaO', value: '40-55%' }] });
    assert.equal((await service.register(input({ cao: 50 }))).passed, true);
  });

  it('несуществующие печь или марка отклоняются ошибкой 400', async () => {
    await assert.rejects(makeService({ furnaceIds: [] }).service.register(input()), (e) => e instanceof ValidationError && /печь/.test(e.message));
    await assert.rejects(makeService({ gradeIds: [] }).service.register(input()), (e) => e instanceof ValidationError && /марка/.test(e.message));
  });

  it('если задания нет, оно создаётся; если есть, используется существующее', async () => {
    const fresh = makeService();
    await fresh.service.register(input());
    assert.equal(fresh.state.tasks.length, 1);

    const existing = makeService({ existingTask: { task_id: 7, furnace_id: 1, grade_id: 3 } });
    await existing.service.register(input());
    assert.equal(existing.state.tasks.length, 1);
    assert.equal(existing.state.samples[0].taskId, 7);
  });

  it('задание и проба сохраняются в одной транзакции', async () => {
    const { service, state } = makeService();
    await service.register(input());
    assert.equal(state.transactions, 1);
  });

  it('без введённого ID код пробы формируется автоматически', async () => {
    const { service, state } = makeService();
    await service.register(input({ code: null }));
    assert.deepEqual(state.codes, [1]);
  });

  it('список и получение по идентификатору возвращают числовые значения', async () => {
    const { service } = makeService();
    await service.register(input());
    assert.equal((await service.list())[0].mgo_pct, 1.1);
    assert.equal((await service.getById(1)).sample_code, 'TST-1');
    await assert.rejects(service.getById(99), NotFoundError);
  });

  it('удаление существующей пробы проходит, несуществующей – ошибка 404', async () => {
    const { service } = makeService();
    await service.register(input());
    await service.remove(1);
    await assert.rejects(service.remove(42), (err) => err instanceof NotFoundError && err.status === 404);
  });
});

describe('Модуль labSampleDto.js (формат пробы)', () => {
  it('разбирает тело запроса с проверкой полей', () => {
    const dto = parseCreateLabSample({ furnace_id: '2', grade_id: 3, cao: '64.1', mgo: 1.2, sample_code: ' A-1 ', notes: '' });
    assert.deepEqual(dto, { furnaceId: 2, gradeId: 3, cao: 64.1, mgo: 1.2, code: 'A-1', notes: null });
    assert.throws(() => parseCreateLabSample({}), ValidationError);
    assert.throws(() => parseCreateLabSample({ furnace_id: 1, grade_id: 1, cao: 101, mgo: 1 }), /от 0 до 100/);
  });

  it('переводит строку БД в объект ответа', () => {
    const dto = toLabSampleDto({ sample_id: 1, sample_code: 'A', sample_time: 't', cao_pct: '64.00', mgo_pct: null, notes: null, passed: true, furnace_id: 1, furnace_name: 'Печь №1', grade_name: 'М500' });
    assert.equal(dto.cao_pct, 64);
    assert.equal(dto.mgo_pct, null);
  });
});
