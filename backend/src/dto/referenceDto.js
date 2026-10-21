const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

export const toGradeItem = (row) => ({
  id: row.grade_id,
  name: row.grade_name,
  value: row.standard_code || '',
  strength: toNumber(row.compress_strength_mpa),
  price: toNumber(row.price_per_ton),
});

export const toReferenceItem = (row) => ({
  id: row.item_id,
  name: row.name,
  value: row.value,
  description: row.description || '',
  url: row.doc_url || '',
  hasFile: Boolean(row.file_name),
  fileName: row.file_name || null,
});
