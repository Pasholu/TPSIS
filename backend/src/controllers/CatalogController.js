import { Router } from 'express';
import { asyncHandler } from '../middleware/http.js';

/**
 * Отдаёт списки только для чтения. Каждому источнику нужен один метод findAll(),
 * поэтому контроллер не зависит от полного интерфейса репозиториев.
 * @param {Record<string, { findAll(): Promise<object[]> }>} sources ключ = путь ресурса
 */
export class CatalogController {
  constructor(sources) {
    this.sources = sources;
  }

  routes() {
    const router = Router();
    for (const [path, source] of Object.entries(this.sources)) {
      router.get(`/${path}`, asyncHandler(async (req, res) => {
        res.json(await source.findAll());
      }));
    }
    router.get('/health', (req, res) => res.json({ status: 'OK', message: 'Server is running' }));
    return router;
  }
}
