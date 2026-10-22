import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseId, parseNumber, parseRange, parseText, parseUrl } from '../src/validation.js';
import { ConflictError, HttpError, NotFoundError, PayloadTooLargeError, ValidationError } from '../src/errors.js';

describe('Модуль validation.js (проверка входных данных)', () => {
  it('parseId принимает положительное целое и отклоняет остальное', () => {
    assert.equal(parseId('7'), 7);
    for (const bad of ['0', '-3', '1.5', 'abc', undefined]) {
      assert.throws(() => parseId(bad), ValidationError);
    }
    assert.throws(() => parseId('x', 'идентификатор печи'), /Некорректный идентификатор печи/);
  });

  it('parseNumber проверяет обязательность, тип и диапазон', () => {
    assert.equal(parseNumber('64.5', 'CaO', { min: 0, max: 100 }), 64.5);
    assert.equal(parseNumber('', 'Цена', { required: false }), null);
    assert.throws(() => parseNumber('', 'CaO'), /обязательно/);
    assert.throws(() => parseNumber('abc', 'CaO'), /должно быть числом/);
    assert.throws(() => parseNumber('150', 'CaO', { min: 0, max: 100 }), /от 0 до 100/);
  });

  it('parseText обрезает пробелы и ограничивает длину', () => {
    assert.equal(parseText('  М500  ', 'Марка'), 'М500');
    assert.equal(parseText('   ', 'Примечание', { required: false }), null);
    assert.throws(() => parseText(undefined, 'Название'), /обязательно/);
    assert.throws(() => parseText('x'.repeat(51), 'ID пробы', { max: 50 }), /длиннее 50/);
  });

  it('parseUrl допускает только http и https', () => {
    assert.equal(parseUrl('https://example.com/gost'), 'https://example.com/gost');
    assert.equal(parseUrl(''), null);
    assert.throws(() => parseUrl('javascript:alert(1)'), ValidationError);
    assert.throws(() => parseUrl('просто текст'), ValidationError);
  });

  it('parseRange разбирает диапазон с точкой, запятой и тире', () => {
    assert.deepEqual(parseRange('62.0-66.0%'), { min: 62, max: 66 });
    assert.deepEqual(parseRange('0,8 – 1,5 %'), { min: 0.8, max: 1.5 });
    assert.equal(parseRange('66-62'), null);
    assert.equal(parseRange('много'), null);
  });
});

describe('Модуль errors.js (ошибки предметной области)', () => {
  it('каждая ошибка несёт свой HTTP-код и подставима вместо HttpError', () => {
    const cases = [[new ValidationError('x'), 400], [new NotFoundError(), 404], [new ConflictError('x'), 409], [new PayloadTooLargeError('x'), 413]];
    for (const [err, status] of cases) {
      assert.ok(err instanceof HttpError);
      assert.equal(err.status, status);
    }
    assert.equal(new NotFoundError().message, 'Запись не найдена');
  });
});
