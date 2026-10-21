import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LabSampleService } from '../src/services/LabSampleService.js';
import { ToleranceService } from '../src/services/ToleranceService.js';
import { NotFoundError, ValidationError } from '../src/errors.js';

// Поддельные хранилища в памяти: сервис получает их через конструктор вместо PostgreSQL.
const makeService = ({ furnaceIds = [1], gradeIds = [3], existingTask = null, tolerances = [] } = {}) => {
  const state = { samples: [], tasks: existingTask ? [existingTask] : [], codes: [] };
  const deps = {
    db: { transaction: (work) => work('tx') },
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
        return { ...s, cao_pct: String(s.cao), mgo_pct: String(s.mgo), sample_time: '2026-10-21T10:00:00Z' };
      },
      deleteById: async (id) => state.samples.some((x) => x.sample_id === id),
    },
    tolerances: new ToleranceService({ referenceItems: { findByCategory: async () => tolerances } }),
  };
  return { service: new LabSampleService(deps), state };
};

const input = (over = {}) => ({ furnaceId: 1, gradeId: 3, cao: 64, mgo: 1.1, code: 'TST-1', notes: null, ...over });

test('проба в пределах допусков получает признак «годна»', async () => {
  const { service } = makeService();
  const sample = await service.register(input());
  assert.equal(sample.passed, true);
  assert.equal(sample.cao_pct, 64);
});

test('проба вне допуска получает признак «брак»', async () => {
  const { service } = makeService();
  assert.equal((await service.register(input({ cao: 50 }))).passed, false);
  assert.equal((await service.register(input({ code: 'TST-2', mgo: 3 }))).passed, false);
});

test('допуски берутся из справочника, а не только по умолчанию', async () => {
  const { service } = makeService({ tolerances: [{ name: 'CaO', value: '40-55%' }] });
  assert.equal((await service.register(input({ cao: 50 }))).passed, true);
});

test('несуществующая печь отклоняется ошибкой 400', async () => {
  const { service } = makeService({ furnaceIds: [] });
  await assert.rejects(service.register(input()), (err) => err instanceof ValidationError && err.status === 400);
});

test('если задания нет, оно создаётся; если есть, используется существующее', async () => {
  const fresh = makeService();
  await fresh.service.register(input());
  assert.equal(fresh.state.tasks.length, 1);

  const existing = makeService({ existingTask: { task_id: 7, furnace_id: 1, grade_id: 3 } });
  await existing.service.register(input());
  assert.equal(existing.state.tasks.length, 1);
  assert.equal(existing.state.samples[0].taskId, 7);
});

test('без введённого ID код пробы формируется автоматически', async () => {
  const { service, state } = makeService();
  await service.register(input({ code: null }));
  assert.deepEqual(state.codes, [1]);
});

test('удаление несуществующей пробы даёт ошибку 404', async () => {
  const { service } = makeService();
  await assert.rejects(service.remove(42), (err) => err instanceof NotFoundError && err.status === 404);
});
