import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIMITS, ToleranceService } from '../src/services/ToleranceService.js';

const serviceWith = (rows) => new ToleranceService({ referenceItems: { findByCategory: async () => rows } });

describe('Класс ToleranceService (допуски CaO и MgO)', () => {
  it('без записей справочника применяются допуски по умолчанию', async () => {
    assert.deepEqual(await serviceWith([]).getLabLimits(), { cao: { min: 62, max: 66 }, mgo: { min: 0.8, max: 1.5 } });
  });

  it('допуски из справочника заменяют значения по умолчанию, регистр названия не важен', async () => {
    const limits = await serviceWith([{ name: ' cao ', value: '60-65%' }, { name: 'MgO', value: '1,0 - 2,0 %' }]).getLabLimits();
    assert.deepEqual(limits, { cao: { min: 60, max: 65 }, mgo: { min: 1, max: 2 } });
  });

  it('записи с неверным диапазоном и других элементов игнорируются', async () => {
    const limits = await serviceWith([{ name: 'CaO', value: 'много' }, { name: 'SiO2', value: '19-21%' }]).getLabLimits();
    assert.deepEqual(limits.cao, DEFAULT_LIMITS.cao);
    assert.equal('sio2' in limits, false);
  });

  it('isPassed: границы допуска включаются, выход любого элемента – брак', () => {
    const s = serviceWith([]);
    const limits = { cao: { min: 62, max: 66 }, mgo: { min: 0.8, max: 1.5 } };
    assert.equal(s.isPassed(62, 0.8, limits), true);
    assert.equal(s.isPassed(66, 1.5, limits), true);
    assert.equal(s.isPassed(61.99, 1, limits), false);
    assert.equal(s.isPassed(64, 1.51, limits), false);
  });
});
