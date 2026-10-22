import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReferenceService } from '../src/services/ReferenceService.js';
import { CementGradeCategory, TextReferenceCategory, requireRange } from '../src/services/referenceCategories.js';
import { NotFoundError, ValidationError } from '../src/errors.js';

const memoryItems = () => {
  const rows = [];
  return {
    rows,
    findByCategory: async (c) => rows.filter((r) => r.category === c),
    create: async (category, data) => {
      const row = { item_id: rows.length + 1, category, name: data.name, value: data.value, description: data.description, doc_url: data.url, file_name: null };
      rows.push(row);
      return row;
    },
    update: async (category, id, data) => {
      const row = rows.find((r) => r.item_id === id && r.category === category);
      return row ? Object.assign(row, { ...data, doc_url: data.url }) : null;
    },
    deleteInCategory: async (category, id) => {
      const i = rows.findIndex((r) => r.item_id === id && r.category === category);
      if (i < 0) return false;
      rows.splice(i, 1);
      return true;
    },
  };
};

const memoryGrades = () => {
  const rows = [{ grade_id: 1, grade_name: 'М500', standard_code: 'ГОСТ 31108', compress_strength_mpa: '50.00', price_per_ton: null }];
  return {
    findAll: async () => rows,
    create: async (g) => ({ grade_id: 2, grade_name: g.name, standard_code: g.standard, compress_strength_mpa: g.strength, price_per_ton: g.price }),
    update: async (id, g) => (id === 1 ? { grade_id: 1, grade_name: g.name, standard_code: g.standard, compress_strength_mpa: g.strength, price_per_ton: g.price } : null),
    deleteById: async (id) => id === 1,
  };
};

describe('Класс ReferenceService (справочники)', () => {
  it('возвращает все справочники по ключам', async () => {
    const items = memoryItems();
    const service = new ReferenceService({ cementTypes: new CementGradeCategory(memoryGrades()), recipes: new TextReferenceCategory({ key: 'recipes', items }) });
    await service.create('recipes', { name: 'Рецепт', value: 'CaCO3:75%' });
    const all = await service.getAll();
    assert.deepEqual(Object.keys(all), ['cementTypes', 'recipes']);
    assert.equal(all.cementTypes[0].strength, 50);
    assert.equal(all.recipes[0].name, 'Рецепт');
  });

  it('неизвестный справочник даёт 404, в том числе имена свойств объекта', async () => {
    const service = new ReferenceService({});
    await assert.rejects(service.create('nope', {}), NotFoundError);
    await assert.rejects(service.update('constructor', 1, {}), NotFoundError);
    await assert.rejects(service.remove('__proto__', 1), NotFoundError);
  });
});

describe('Класс TextReferenceCategory (текстовые справочники)', () => {
  it('создаёт, изменяет и удаляет запись', async () => {
    const items = memoryItems();
    const cat = new TextReferenceCategory({ key: 'tempRegimes', items });
    const created = await cat.create({ name: ' Режим 1 ', value: '1400-1450°C', description: 'Оптимальный' });
    assert.equal(created.name, 'Режим 1');
    assert.equal((await cat.update(created.id, { name: 'Режим 1', value: '1410-1450°C' })).value, '1410-1450°C');
    await cat.remove(created.id);
    assert.equal(items.rows.length, 0);
  });

  it('несуществующая запись при изменении и удалении даёт 404', async () => {
    const cat = new TextReferenceCategory({ key: 'recipes', items: memoryItems() });
    await assert.rejects(cat.update(5, { name: 'x', value: 'y' }), NotFoundError);
    await assert.rejects(cat.remove(5), NotFoundError);
  });

  it('справочник допусков отклоняет значение без диапазона', async () => {
    const cat = new TextReferenceCategory({ key: 'tolerances', items: memoryItems(), validateValue: requireRange });
    await assert.rejects(cat.create({ name: 'CaO', value: 'много' }), ValidationError);
    assert.equal((await cat.create({ name: 'CaO', value: '60-65%' })).value, '60-65%');
  });

  it('ссылка сохраняется только у нормативных документов и проверяется', async () => {
    const items = memoryItems();
    const standards = new TextReferenceCategory({ key: 'standards', items, withUrl: true });
    const recipes = new TextReferenceCategory({ key: 'recipes', items });
    assert.equal((await standards.create({ name: 'ГОСТ', value: 'G', url: 'https://example.com' })).url, 'https://example.com');
    assert.equal((await recipes.create({ name: 'Р', value: 'V', url: 'https://example.com' })).url, '');
    await assert.rejects(standards.create({ name: 'ГОСТ', value: 'G', url: 'ftp://x' }), ValidationError);
  });

  it('после удаления документа вызывается удаление его файла', async () => {
    const removed = [];
    const cat = new TextReferenceCategory({ key: 'standards', items: memoryItems(), withUrl: true, onRemove: async (id) => removed.push(id) });
    const doc = await cat.create({ name: 'ГОСТ', value: 'G' });
    await cat.remove(doc.id);
    assert.deepEqual(removed, [doc.id]);
  });
});

describe('Класс CementGradeCategory (марки цемента)', () => {
  it('проверяет поля марки и возвращает числа', async () => {
    const cat = new CementGradeCategory(memoryGrades());
    const created = await cat.create({ name: 'М600', value: 'ГОСТ 31108', strength: '60', price: '' });
    assert.deepEqual(created, { id: 2, name: 'М600', value: 'ГОСТ 31108', strength: 60, price: null });
    await assert.rejects(cat.create({ name: 'М700' }), /Прочность/);
  });

  it('изменение и удаление несуществующей марки дают 404', async () => {
    const cat = new CementGradeCategory(memoryGrades());
    assert.equal((await cat.update(1, { name: 'М500Д0', strength: 50 })).name, 'М500Д0');
    await assert.rejects(cat.update(9, { name: 'x', strength: 1 }), NotFoundError);
    await cat.remove(1);
    await assert.rejects(cat.remove(9), NotFoundError);
  });
});
