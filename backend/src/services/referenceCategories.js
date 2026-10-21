import { NotFoundError, ValidationError } from '../errors.js';
import { parseNumber, parseRange, parseText, parseUrl } from '../validation.js';
import { toGradeItem, toReferenceItem } from '../dto/referenceDto.js';

/**
 * Общий контракт справочника, с которым работает ReferenceService:
 * list(), create(body), update(id, body), remove(id).
 */

export class CementGradeCategory {
  constructor(grades) {
    this.grades = grades;
  }

  #parse(body = {}) {
    return {
      name: parseText(body.name, 'Марка', { max: 50 }),
      standard: parseText(body.value, 'Стандарт', { max: 50, required: false }),
      strength: parseNumber(body.strength, 'Прочность, МПа', { min: 0, max: 1000 }),
      price: parseNumber(body.price, 'Цена, ₽/т', { min: 0, max: 10000000, required: false }),
    };
  }

  async list() {
    return (await this.grades.findAll()).map(toGradeItem);
  }

  async create(body) {
    return toGradeItem(await this.grades.create(this.#parse(body)));
  }

  async update(id, body) {
    const row = await this.grades.update(id, this.#parse(body));
    if (!row) throw new NotFoundError();
    return toGradeItem(row);
  }

  async remove(id) {
    if (!(await this.grades.deleteById(id))) throw new NotFoundError();
  }
}

export const requireRange = (value) => {
  if (!parseRange(value)) throw new ValidationError('Допуск задаётся диапазоном, например 62.0-66.0%');
};

export class TextReferenceCategory {
  constructor({ key, items, validateValue = () => {}, withUrl = false, onRemove = async () => {} }) {
    this.key = key;
    this.items = items;
    this.validateValue = validateValue;
    this.withUrl = withUrl;
    this.onRemove = onRemove;
  }

  #parse(body = {}) {
    const value = parseText(body.value, 'Значение', { max: 500 });
    this.validateValue(value);
    return {
      name: parseText(body.name, 'Название', { max: 200 }),
      value,
      description: parseText(body.description, 'Описание', { max: 1000, required: false }),
      url: this.withUrl ? parseUrl(body.url) : null,
    };
  }

  async list() {
    return (await this.items.findByCategory(this.key)).map(toReferenceItem);
  }

  async create(body) {
    return toReferenceItem(await this.items.create(this.key, this.#parse(body)));
  }

  async update(id, body) {
    const row = await this.items.update(this.key, id, this.#parse(body));
    if (!row) throw new NotFoundError();
    return toReferenceItem(row);
  }

  async remove(id) {
    if (!(await this.items.deleteInCategory(this.key, id))) throw new NotFoundError();
    await this.onRemove(id);
  }
}
