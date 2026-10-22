import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/db/Database.js';
import { DatabaseMigrator } from '../src/db/DatabaseMigrator.js';
import { createContainer } from '../src/container.js';
import { config } from '../src/config.js';
import { fakeDb } from './helpers/fakes.js';

describe('Класс Database (транзакции)', () => {
  const withFakePool = () => {
    const log = [];
    const db = new Database('postgresql://user:pass@localhost:1/none');
    const client = { query: async (sql) => log.push(sql), release: () => log.push('release') };
    db.pool = { connect: async () => client, query: async (sql) => ({ rows: [sql] }), end: async () => log.push('end') };
    return { db, log };
  };

  it('фиксирует транзакцию при успехе', async () => {
    const { db, log } = withFakePool();
    assert.equal(await db.transaction(async (tx) => { await tx.query('INSERT'); return 'ok'; }), 'ok');
    assert.deepEqual(log, ['BEGIN', 'INSERT', 'COMMIT', 'release']);
    assert.deepEqual((await db.query('SELECT 1')).rows, ['SELECT 1']);
    await db.close();
  });

  it('откатывает транзакцию при ошибке и освобождает соединение', async () => {
    const { db, log } = withFakePool();
    await assert.rejects(db.transaction(async () => { throw new Error('сбой'); }), /сбой/);
    assert.deepEqual(log, ['BEGIN', 'ROLLBACK', 'release']);
  });
});

describe('Класс DatabaseMigrator (обновление схемы БД)', () => {
  const migrate = async ({ references = 0 } = {}) => {
    const db = fakeDb([
      [/COUNT\(\*\)::int AS n FROM reference_item/, () => [{ n: references }]],
      [/SELECT sample_id, compress_strength_mpa/, () => [{ sample_id: 4, compress_strength_mpa: '64.00', moisture_pct: '2.00' }]],
      [/SELECT furnace_id FROM furnace/, () => [{ furnace_id: 1 }, { furnace_id: 2 }]],
      [/SELECT operator_id FROM operator/, () => [{ operator_id: 1 }]],
      [/SELECT grade_id FROM cement_grade/, () => [{ grade_id: 1 }]],
      [/SELECT laborer_id FROM laborer/, () => [{ laborer_id: 1 }]],
      [/SELECT 1 FROM production_task/, ([id]) => (id === 1 ? [{}] : [])],
    ]);
    const tolerances = { getLabLimits: async () => ({ cao: { min: 62, max: 66 }, mgo: { min: 0.8, max: 1.5 } }), isPassed: (c, m) => m <= 1.5 };
    await new DatabaseMigrator({ db, tolerances }).run();
    return db.calls;
  };

  it('создаёт таблицы, заполняет справочники и задание для печи без задания', async () => {
    const calls = await migrate();
    assert.ok(calls[0].sql.includes('CREATE TABLE IF NOT EXISTS reference_item'));
    assert.equal(calls.filter((c) => c.sql.startsWith('INSERT INTO reference_item')).length, 12);
    const tasks = calls.filter((c) => c.sql.startsWith('INSERT INTO production_task'));
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].params[0], 2);
  });

  it('переносит старые значения CaO/MgO и пересчитывает признак годности', async () => {
    const update = (await migrate()).find((c) => c.sql.startsWith('UPDATE lab_sample SET cao_pct'));
    assert.deepEqual(update.params, [4, 64, 2, false]);
  });

  it('повторный запуск не дублирует начальные справочники', async () => {
    const calls = await migrate({ references: 15 });
    assert.equal(calls.filter((c) => c.sql.startsWith('INSERT INTO reference_item')).length, 0);
  });
});

describe('Модуль container.js (корень композиции)', () => {
  it('создаёт все контроллеры, мигратор и симулятор без подключения к БД', async () => {
    const container = createContainer({ ...config, databaseUrl: 'postgresql://user:pass@localhost:1/none' });
    assert.equal(container.controllers.length, 5);
    for (const c of container.controllers) assert.equal(typeof c.routes(), 'function');
    assert.ok(container.migrator && container.simulator);
    await container.db.close();
  });

  it('конфигурация содержит значения по умолчанию', () => {
    assert.equal(config.maxPdfBytes, 20 * 1024 * 1024);
    assert.equal(typeof config.port, 'number');
    assert.ok(config.uploadDir.endsWith('uploads'));
  });
});
