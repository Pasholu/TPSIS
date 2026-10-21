import { NotFoundError } from '../errors.js';

const MAX_HOURS = 168;

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
    return this.readings.findForFurnace(furnaceId, period);
  }
}
