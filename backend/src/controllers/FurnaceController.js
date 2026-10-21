import { Router } from 'express';
import { asyncHandler } from '../middleware/http.js';
import { parseId } from '../validation.js';

export class FurnaceController {
  constructor({ furnaceService }) {
    this.furnaceService = furnaceService;
  }

  routes() {
    const router = Router();

    router.get('/furnaces/:id/current', asyncHandler(async (req, res) => {
      res.json(await this.furnaceService.getCurrentState(parseId(req.params.id)));
    }));

    router.get('/sensor-readings', asyncHandler(async (req, res) => {
      const furnaceId = parseId(req.query.furnace_id, 'идентификатор печи');
      res.json(await this.furnaceService.getReadings(furnaceId, Number(req.query.hours) || 24));
    }));

    return router;
  }
}
