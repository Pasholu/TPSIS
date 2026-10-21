import { parseId, parseNumber, parseText } from '../validation.js';

const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

export const parseCreateLabSample = (body = {}) => ({
  furnaceId: parseId(body.furnace_id, 'идентификатор печи'),
  gradeId: parseId(body.grade_id, 'идентификатор марки цемента'),
  cao: parseNumber(body.cao, 'CaO', { min: 0, max: 100 }),
  mgo: parseNumber(body.mgo, 'MgO', { min: 0, max: 100 }),
  code: parseText(body.sample_code, 'ID пробы', { max: 50, required: false }),
  notes: parseText(body.notes, 'Примечание', { max: 1000, required: false }),
});

export const toLabSampleDto = (row) => ({
  sample_id: row.sample_id,
  sample_code: row.sample_code,
  sample_time: row.sample_time,
  cao_pct: toNumber(row.cao_pct),
  mgo_pct: toNumber(row.mgo_pct),
  notes: row.notes,
  passed: row.passed,
  furnace_id: row.furnace_id,
  furnace_name: row.furnace_name,
  grade_name: row.grade_name,
});
