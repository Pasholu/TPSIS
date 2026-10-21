import express, { Router } from 'express';
import { asyncHandler } from '../middleware/http.js';
import { parseId, parseText } from '../validation.js';

export class ReferenceController {
  constructor({ references, documents, maxPdfBytes }) {
    this.references = references;
    this.documents = documents;
    this.maxPdfBytes = maxPdfBytes;
  }

  routes() {
    const router = Router();

    router.get('/references', asyncHandler(async (req, res) => {
      res.json(await this.references.getAll());
    }));

    router.post('/references/:category', asyncHandler(async (req, res) => {
      res.status(201).json(await this.references.create(req.params.category, req.body));
    }));

    router.put('/references/:category/:id', asyncHandler(async (req, res) => {
      res.json(await this.references.update(req.params.category, parseId(req.params.id), req.body));
    }));

    router.delete('/references/:category/:id', asyncHandler(async (req, res) => {
      await this.references.remove(req.params.category, parseId(req.params.id));
      res.json({ success: true });
    }));

    router.put(
      '/references/standards/:id/file',
      express.raw({ type: 'application/pdf', limit: this.maxPdfBytes }),
      asyncHandler(async (req, res) => {
        const fileName = parseText(req.query.name, 'Имя файла', { max: 255, required: false });
        res.json(await this.documents.attach(parseId(req.params.id), req.body, fileName));
      })
    );

    router.get('/references/standards/:id/file', asyncHandler(async (req, res) => {
      const { data, fileName } = await this.documents.open(parseId(req.params.id));
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(data);
    }));

    router.delete('/references/standards/:id/file', asyncHandler(async (req, res) => {
      res.json(await this.documents.detach(parseId(req.params.id)));
    }));

    return router;
  }
}
