import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(ROOT, '.env') });

export const config = Object.freeze({
  port: Number(process.env.PORT) || 5000,
  databaseUrl: process.env.DATABASE_URL,
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT, 'uploads'),
  maxPdfBytes: 20 * 1024 * 1024,
  simulateSensors: process.env.SIMULATE_SENSORS !== 'false',
  sensorIntervalMs: Number(process.env.SENSOR_INTERVAL_MS) || 60000,
});
