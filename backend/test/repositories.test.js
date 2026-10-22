import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaseRepository } from '../src/repositories/BaseRepository.js';
import { CementGradeRepository } from '../src/repositories/CementGradeRepository.js';
import { FurnaceRepository } from '../src/repositories/FurnaceRepository.js';
import { LabSampleRepository } from '../src/repositories/LabSampleRepository.js';
import { ProductionTaskRepository } from '../src/repositories/ProductionTaskRepository.js';
import { ReferenceItemRepository } from '../src/repositories/ReferenceItemRepository.js';
import { SensorReadingRepository } from '../src/repositories/SensorReadingRepository.js';
import { ConflictError } from '../src/errors.js';
import { fakeDb, pgError } from './helpers/fakes.js';

describe('Класс BaseRepository (общие операции)', () => {
  it('формирует параметризованные запросы к своей таблице', async () => {
    const db = fakeDb([[/WHERE operator_id = \$1/, ([id]) => (id === 1 ? [{ operator_id: 1 }] : [])], [/^SELECT \* FROM operator ORDER/, () => [{ operator_id: 1 }]], [/DELETE/, () => ({ rows: [], rowCount: 1 })]]);
    const repo = new BaseRepository(db, 'operator', 'operator_id');
    assert.equal((await repo.findAll()).length, 1);
    assert.deepEqual(await repo.findById(1), { operator_id: 1 });
    assert.equal(await repo.findById(2), null);
    assert.equal(await repo.exists(1), true);
    assert.equal(await repo.deleteById(1), true);
    assert.deepEqual(db.calls.at(-1), { sql: 'DELETE FROM operator WHERE operator_id = $1', params: [1] });
  });
});

describe('Классы-наследники BaseRepository', () => {
  it('CementGradeRepository переводит ошибку внешнего ключа в 409', async () => {
    const repo = new CementGradeRepository(fakeDb([[/DELETE/, () => pgError('23503')], [/INSERT|UPDATE/, (p) => [{ grade_id: 2, grade_name: p[0] }]]]));
    await assert.rejects(repo.deleteById(1), (e) => e instanceof ConflictError && /используется/.test(e.message));
    assert.equal((await repo.create({ name: 'М600' })).grade_name, 'М600');
    assert.equal((await repo.update(2, { name: 'М700' })).grade_name, 'М700');
    const other = new CementGradeRepository(fakeDb([[/DELETE/, () => pgError('XX000')]]));
    await assert.rejects(other.deleteById(1), (e) => e.code === 'XX000');
  });

  it('LabSampleRepository переводит нарушение уникальности ID пробы в 409', async () => {
    const db = fakeDb([[/INSERT INTO lab_sample/, (p) => (p[1] === 'DUP' ? pgError('23505') : [{ sample_id: 3 }])], [/WHERE ls.sample_id/, () => [{ sample_id: 3 }]]]);
    const repo = new LabSampleRepository(db);
    await assert.rejects(repo.create({ code: 'DUP' }), ConflictError);
    assert.equal((await repo.create({ code: 'OK' })).sample_id, 3);
    await repo.assignGeneratedCode(3);
    assert.match(db.calls.at(-1).sql, /ПР-/);
    assert.equal((await repo.findDetailedById(3)).sample_id, 3);
    assert.deepEqual(await repo.findAllDetailed(), []);
    await assert.rejects(new LabSampleRepository(fakeDb([[/INSERT/, () => pgError('XX000')]])).create({}), (e) => e.code === 'XX000');
  });

  it('ProductionTaskRepository ищет последнее задание и создаёт новое с оператором текущей смены', async () => {
    const db = fakeDb([[/WITH cur AS/, (p) => [{ task_id: 9, furnace_id: p[0], grade_id: p[1] }]]]);
    const repo = new ProductionTaskRepository(db);
    assert.equal(await repo.findLatestFor(1, 3), null);
    assert.equal((await repo.createActive(1, 3)).task_id, 9);
    assert.match(db.calls.at(-1).sql, /COALESCE\(\(SELECT operator_id FROM cur\)/);
    assert.deepEqual(await repo.findAllDetailed(), []);
  });

  it('FurnaceRepository и ReferenceItemRepository передают параметры запросам', async () => {
    const db = fakeDb([[/RETURNING/, (p) => [{ item_id: 1, params: p }]], [/DELETE/, () => ({ rows: [], rowCount: 0 })]]);
    const furnaces = new FurnaceRepository(db);
    assert.equal(await furnaces.findCurrentState(1), null);
    const items = new ReferenceItemRepository(db);
    await items.findByCategory('recipes');
    assert.equal(await items.findInCategory('recipes', 1), null);
    assert.deepEqual((await items.create('recipes', { name: 'n', value: 'v', description: null, url: null })).params, ['recipes', 'n', 'v', null, null]);
    assert.equal((await items.update('recipes', 1, { name: 'n', value: 'v' })).item_id, 1);
    assert.equal(await items.deleteInCategory('recipes', 1), false);
    assert.equal((await items.setFileName(1, 'a.pdf')).item_id, 1);
  });

  it('SensorReadingRepository строит запросы с периодом и списком полей', async () => {
    const db = fakeDb();
    const repo = new SensorReadingRepository(db);
    await repo.findForFurnace(1, 24);
    assert.deepEqual(db.calls[0].params, [1, '24']);
    assert.equal(await repo.findLatest(1), null);
    await repo.insert(1, 't', { temperature: 1, pressure: 2, fuel_consumption: 3, o2_percent: 4, cao_pct: 5, sio2_pct: 6, al2o3_pct: 7, electricity: 8, output_tph: 9 });
    assert.deepEqual(db.calls.at(-1).params, [1, 't', 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await repo.deleteOlderThan(7);
    await repo.aggregateByShift();
    await repo.hourlyFuel();
    assert.deepEqual(db.calls.at(-1).params, ['24']);
  });
});
