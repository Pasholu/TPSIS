import { HttpError } from '../errors.js';

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export const notFound = (req, res) => res.status(404).json({ error: 'Маршрут не найден' });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Некорректный JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Файл больше 20 МБ' });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'Запись с таким значением уже существует' });
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};
