import { Router } from 'express';
import { asyncHandler } from '../middleware/http.js';

export class EnergyController {
  constructor({ energyService }) {
    this.energyService = energyService;
  }

  routes() {
    const router = Router();
    router.get('/energy', asyncHandler(async (req, res) => {
      res.json(await this.energyService.getReport());
    }));
    return router;
  }
}
