export const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

const present = (values) => values.filter((v) => v !== null);

export const sum = (values) => {
  const v = present(values);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};

export const mean = (values) => {
  const v = present(values);
  return v.length ? sum(v) / v.length : null;
};

export const percentChange = (current, previous) =>
  current === null || previous === null || previous === 0 ? null : ((current - previous) / previous) * 100;
