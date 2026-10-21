import express from 'express';
import cors from 'cors';
import { errorHandler, notFound } from './middleware/http.js';

export const createApp = (controllers) => {
  const app = express();
  app.use(cors());
  app.use(express.json());
  for (const controller of controllers) app.use('/api', controller.routes());
  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
};
