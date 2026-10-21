import { parseRange } from '../validation.js';

export const DEFAULT_LIMITS = Object.freeze({
  cao: Object.freeze({ min: 62, max: 66 }),
  mgo: Object.freeze({ min: 0.8, max: 1.5 }),
});

const within = (value, range) => value >= range.min && value <= range.max;

export class ToleranceService {
  /** @param {{ referenceItems: { findByCategory(category: string): Promise<object[]> } }} deps */
  constructor({ referenceItems }) {
    this.referenceItems = referenceItems;
  }

  async getLabLimits() {
    const limits = { cao: { ...DEFAULT_LIMITS.cao }, mgo: { ...DEFAULT_LIMITS.mgo } };
    for (const row of await this.referenceItems.findByCategory('tolerances')) {
      const key = row.name.trim().toLowerCase();
      const range = parseRange(row.value);
      if (range && key in limits) limits[key] = range;
    }
    return limits;
  }

  isPassed(cao, mgo, limits) {
    return within(cao, limits.cao) && within(mgo, limits.mgo);
  }
}
