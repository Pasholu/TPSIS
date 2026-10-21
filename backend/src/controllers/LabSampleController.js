import { Router } from 'express';
import { asyncHandler } from '../middleware/http.js';
import { parseId } from '../validation.js';
import { parseCreateLabSample } from '../dto/labSampleDto.js';

export class LabSampleController {
  constructor({ labSamples, tolerances }) {
    this.labSamples = labSamples;
    this.tolerances = tolerances;
  }

  routes() {
    const router = Router();

    router.get('/lab-limits', asyncHandler(async (req, res) => {
      res.json(await this.tolerances.getLabLimits());
    }));

    router.get('/lab-samples', asyncHandler(async (req, res) => {
      res.json(await this.labSamples.list());
    }));

    router.get('/lab-samples/:id', asyncHandler(async (req, res) => {
      res.json(await this.labSamples.getById(parseId(req.params.id)));
    }));

    router.post('/lab-samples', asyncHandler(async (req, res) => {
      const sample = await this.labSamples.register(parseCreateLabSample(req.body));
      res.status(201).location(`/api/lab-samples/${sample.sample_id}`).json(sample);
    }));

    router.delete('/lab-samples/:id', asyncHandler(async (req, res) => {
      await this.labSamples.remove(parseId(req.params.id));
      res.json({ success: true });
    }));

    return router;
  }
}
