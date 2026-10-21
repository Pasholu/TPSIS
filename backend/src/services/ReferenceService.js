import { NotFoundError } from '../errors.js';

export class ReferenceService {
  /** @param {Record<string, {list: Function, create: Function, update: Function, remove: Function}>} categories */
  constructor(categories) {
    this.categories = categories;
  }

  async getAll() {
    const keys = Object.keys(this.categories);
    const lists = await Promise.all(keys.map((key) => this.categories[key].list()));
    return Object.fromEntries(keys.map((key, i) => [key, lists[i]]));
  }

  async create(category, body) {
    return this.#category(category).create(body);
  }

  async update(category, id, body) {
    return this.#category(category).update(id, body);
  }

  async remove(category, id) {
    return this.#category(category).remove(id);
  }

  #category(key) {
    if (!Object.hasOwn(this.categories, key)) throw new NotFoundError('Неизвестный справочник');
    return this.categories[key];
  }
}
