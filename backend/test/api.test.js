import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { LabSampleController } from '../src/controllers/LabSampleController.js';
import { ReferenceController } from '../src/controllers/ReferenceController.js';
import { FurnaceController } from '../src/controllers/FurnaceController.js';
import { EnergyController } from '../src/controllers/EnergyController.js';
import { CatalogController } from '../src/controllers/CatalogController.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/errors.js';
import { pdfBytes, pgError } from './helpers/fakes.js';

// Контроллеры и обработчики Express проверяются по HTTP; сервисы заменены заглушками.
const calls = [];
const sample = { sample_id: 7, sample_code: 'ПР-1', passed: true };
const fakes = {
  labSamples: {
    list: async () => [sample],
    getById: async (id) => { if (id !== 7) throw new NotFoundError('Проба не найдена'); return sample; },
    register: async (input) => { calls.push(input); if (input.code === 'DUP') throw new ConflictError('Проба с таким ID уже существует'); return sample; },
    remove: async (id) => { if (id !== 7) throw new NotFoundError('Проба не найдена'); },
  },
  tolerances: { getLabLimits: async () => ({ cao: { min: 62, max: 66 }, mgo: { min: 0.8, max: 1.5 } }) },
  references: {
    getAll: async () => ({ recipes: [] }),
    create: async (category, body) => { if (category === 'nope') throw new NotFoundError('Неизвестный справочник'); return { id: 1, ...body }; },
    update: async (category, id, body) => ({ id, ...body }),
    remove: async () => {},
  },
  documents: {
    attach: async (id, data, name) => { if (!data?.length) throw new ValidationError('Отправьте PDF-файл'); return { id, hasFile: true, fileName: name, size: data.length }; },
    open: async () => ({ data: pdfBytes(), fileName: 'ГОСТ 31108.pdf' }),
    detach: async (id) => ({ id, hasFile: false }),
  },
  furnaceService: {
    getCurrentState: async (id) => ({ furnace_id: id }),
    getReadings: async (id, hours) => [{ furnace_id: id, hours }],
  },
  energyService: { getReport: async () => ({ totals: { fuel: 185 } }) },
};

let server;
let base;
before(async () => {
  const app = createApp([
    new CatalogController({
      furnaces: { findAll: async () => [{ furnace_id: 1 }] },
      broken: { findAll: async () => { throw new Error('connection refused'); } },
      duplicate: { findAll: async () => { throw pgError('23505'); } },
    }),
    new LabSampleController(fakes),
    new ReferenceController({ ...fakes, maxPdfBytes: 64 }),
    new FurnaceController(fakes),
    new EnergyController(fakes),
  ]);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const send = async (method, path, body, type = 'application/json') => {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': type },
    body: body === undefined ? undefined : type === 'application/json' && typeof body !== 'string' ? JSON.stringify(body) : body,
  });
  const ct = res.headers.get('content-type') || '';
  return { status: res.status, headers: res.headers, body: ct.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()) };
};

describe('Контроллеры REST API (маршруты и коды ответов)', () => {
  it('GET /health и списки справочных данных отвечают 200', async () => {
    assert.deepEqual((await send('GET', '/health')).body.status, 'OK');
    assert.deepEqual((await send('GET', '/furnaces')).body, [{ furnace_id: 1 }]);
  });

  it('POST /lab-samples создаёт пробу: 201 и заголовок Location', async () => {
    const res = await send('POST', '/lab-samples', { furnace_id: 1, grade_id: 3, cao: 64, mgo: 1.1 });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('location'), '/api/lab-samples/7');
    assert.deepEqual(calls.at(-1), { furnaceId: 1, gradeId: 3, cao: 64, mgo: 1.1, code: null, notes: null });
  });

  it('POST /lab-samples: неверные данные – 400, дубль ID – 409, битый JSON – 400', async () => {
    assert.equal((await send('POST', '/lab-samples', { furnace_id: 1, grade_id: 3, cao: 'abc', mgo: 1 })).status, 400);
    const dup = await send('POST', '/lab-samples', { sample_code: 'DUP', furnace_id: 1, grade_id: 3, cao: 64, mgo: 1 });
    assert.deepEqual([dup.status, dup.body.error], [409, 'Проба с таким ID уже существует']);
    assert.deepEqual((await send('POST', '/lab-samples', '{oops')).body, { error: 'Некорректный JSON' });
  });

  it('GET и DELETE /lab-samples/{id}: 200, 404 и 400 для нечислового id', async () => {
    assert.equal((await send('GET', '/lab-samples')).body.length, 1);
    assert.equal((await send('GET', '/lab-samples/7')).status, 200);
    assert.equal((await send('GET', '/lab-samples/8')).status, 404);
    assert.equal((await send('GET', '/lab-samples/abc')).status, 400);
    assert.deepEqual((await send('DELETE', '/lab-samples/7')).body, { success: true });
    assert.equal((await send('DELETE', '/lab-samples/8')).status, 404);
    assert.equal((await send('GET', '/lab-limits')).body.cao.min, 62);
  });

  it('справочники: чтение, создание, изменение, удаление и неизвестная категория', async () => {
    assert.deepEqual((await send('GET', '/references')).body, { recipes: [] });
    assert.equal((await send('POST', '/references/recipes', { name: 'Р' })).status, 201);
    assert.equal((await send('PUT', '/references/recipes/3', { name: 'Р2' })).body.id, 3);
    assert.equal((await send('DELETE', '/references/recipes/3')).status, 200);
    assert.equal((await send('POST', '/references/nope', {})).status, 404);
  });

  it('файл документа: загрузка, ограничение размера, выдача PDF и открепление', async () => {
    const up = await send('PUT', '/references/standards/5/file?name=a.pdf', pdfBytes(), 'application/pdf');
    assert.deepEqual([up.status, up.body.fileName], [200, 'a.pdf']);
    assert.equal((await send('PUT', '/references/standards/5/file', Buffer.alloc(100, 1), 'application/pdf')).status, 413);
    assert.equal((await send('PUT', '/references/standards/5/file', 'text', 'text/plain')).status, 400);
    const file = await send('GET', '/references/standards/5/file');
    assert.equal(file.headers.get('content-type'), 'application/pdf');
    assert.match(file.headers.get('content-disposition'), /^inline; filename\*=UTF-8''/);
    assert.equal(file.body.subarray(0, 5).toString(), '%PDF-');
    assert.equal((await send('DELETE', '/references/standards/5/file')).body.hasFile, false);
  });

  it('печи и энергоэффективность: параметры передаются сервисам', async () => {
    assert.deepEqual((await send('GET', '/furnaces/2/current')).body, { furnace_id: 2 });
    assert.deepEqual((await send('GET', '/sensor-readings?furnace_id=2&hours=6')).body, [{ furnace_id: 2, hours: 6 }]);
    assert.equal((await send('GET', '/sensor-readings?furnace_id=2')).body[0].hours, 24);
    assert.equal((await send('GET', '/sensor-readings')).status, 400);
    assert.equal((await send('GET', '/energy')).body.totals.fuel, 185);
  });

  it('неизвестный маршрут – 404, сбой – 500 без подробностей, конфликт БД – 409', async () => {
    assert.deepEqual((await send('GET', '/nothing')).body, { error: 'Маршрут не найден' });
    const original = console.error;
    console.error = () => {};
    const crash = await send('GET', '/broken');
    console.error = original;
    assert.deepEqual([crash.status, crash.body.error], [500, 'Внутренняя ошибка сервера']);
    assert.equal((await send('GET', '/duplicate')).status, 409);
  });
});
