import { NotFoundError } from '../errors.js';
import { toNumber } from './energyMath.js';

const MAX_HOURS = 168;
const READING_FIELDS = ['temperature', 'pressure', 'fuel_consumption', 'o2_percent', 'cao_pct', 'sio2_pct', 'al2o3_pct'];

const toReadingDto = (row) => ({
  reading_time: row.reading_time,
  ...Object.fromEntries(READING_FIELDS.map((f) => [f, toNumber(row[f])])),
});

export class FurnaceService {
  constructor({ furnaces, readings }) {
    this.furnaces = furnaces;
    this.readings = readings;
  }

  async getCurrentState(id) {
    const state = await this.furnaces.findCurrentState(id);
    if (!state) throw new NotFoundError('Печь не найдена');
    return state;
  }

  async getReadings(furnaceId, hours = 24) {
    if (!(await this.furnaces.exists(furnaceId))) throw new NotFoundError('Печь не найдена');
    const period = Math.min(Math.max(Math.trunc(hours) || 24, 1), MAX_HOURS);
    return (await this.readings.findForFurnace(furnaceId, period)).map(toReadingDto);
  }
}
