import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, parseRange, parseUrl } from '../src/validation.js';
import { mean, percentChange, sum } from '../src/services/energyMath.js';
import { ReferenceService } from '../src/services/ReferenceService.js';
import { TextReferenceCategory, requireRange } from '../src/services/referenceCategories.js';
import { HttpError, NotFoundError, ValidationError } from '../src/errors.js';

test('диапазон допуска разбирается с точкой, запятой и тире', () => {
  assert.deepEqual(parseRange('62.0-66.0%'), { min: 62, max: 66 });
  assert.deepEqual(parseRange('0,8 – 1,5 %'), { min: 0.8, max: 1.5 });
  assert.equal(parseRange('66-62'), null);
  assert.equal(parseRange('abc'), null);
});

test('проверка числовых полей', () => {
  assert.equal(parseNumber('64.5', 'CaO', { min: 0, max: 100 }), 64.5);
  assert.throws(() => parseNumber('', 'CaO'), ValidationError);
  assert.throws(() => parseNumber('150', 'CaO', { max: 100 }), /от .* до 100/);
});

test('ссылка допускается только http и https', () => {
  assert.equal(parseUrl('https://example.com/gost'), 'https://example.com/gost');
  assert.throws(() => parseUrl('javascript:alert(1)'), ValidationError);
});

test('расчёты энергоэффективности пропускают отсутствующие значения', () => {
  assert.equal(sum([1, null, 2]), 3);
  assert.equal(mean([2, null, 4]), 3);
  assert.equal(mean([null]), null);
  assert.equal(percentChange(110, 100), 10);
  assert.equal(percentChange(5, 0), null);
});

test('все ошибки предметной области подставимы вместо HttpError', () => {
  for (const err of [new ValidationError('x'), new NotFoundError()]) {
    assert.ok(err instanceof HttpError);
    assert.equal(typeof err.status, 'number');
  }
});

test('справочник допусков отклоняет значение без диапазона', async () => {
  const items = { create: async (category, data) => ({ item_id: 1, category, ...data }) };
  const service = new ReferenceService({
    tolerances: new TextReferenceCategory({ key: 'tolerances', items, validateValue: requireRange }),
  });
  await assert.rejects(service.create('tolerances', { name: 'CaO', value: 'много' }), ValidationError);
  const created = await service.create('tolerances', { name: 'CaO', value: '60-65%' });
  assert.equal(created.value, '60-65%');
});

test('неизвестный справочник даёт 404, в том числе имена свойств объекта', async () => {
  const service = new ReferenceService({});
  await assert.rejects(service.create('nope', {}), NotFoundError);
  await assert.rejects(service.create('constructor', {}), NotFoundError);
});
