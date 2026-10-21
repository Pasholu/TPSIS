import { ValidationError } from './errors.js';

export const parseId = (value, label = 'идентификатор') => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError(`Некорректный ${label}`);
  return n;
};

export const parseNumber = (value, label, { min = -Infinity, max = Infinity, required = true } = {}) => {
  if (value === null || value === undefined || value === '') {
    if (!required) return null;
    throw new ValidationError(`Поле «${label}» обязательно`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ValidationError(`Поле «${label}» должно быть числом`);
  if (n < min || n > max) throw new ValidationError(`Поле «${label}» должно быть от ${min} до ${max}`);
  return n;
};

export const parseText = (value, label, { max = 200, required = true } = {}) => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    if (!required) return null;
    throw new ValidationError(`Поле «${label}» обязательно`);
  }
  if (text.length > max) throw new ValidationError(`Поле «${label}» длиннее ${max} символов`);
  return text;
};

export const parseUrl = (value, label = 'Ссылка') => {
  const text = parseText(value, label, { max: 500, required: false });
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    throw new ValidationError(`${label} должна начинаться с http:// или https://`);
  }
  return text;
};

export const parseRange = (text) => {
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const min = Number(m[1].replace(',', '.'));
  const max = Number(m[2].replace(',', '.'));
  return min <= max ? { min, max } : null;
};
