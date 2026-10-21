import { mean, percentChange, sum, toNumber } from './energyMath.js';

export const SHIFT_HOURS = 8;

const shiftOutput = (tph) => (tph === null ? null : tph * SHIFT_HOURS);

const plantTotals = (furnaces) => ({
  fuel: mean(furnaces.map((f) => f.fuel)),
  electricity: mean(furnaces.map((f) => f.electricity)),
  production: sum(furnaces.map((f) => f.production)),
});

export class EnergyService {
  constructor({ readings }) {
    this.readings = readings;
  }

  async getReport() {
    const [rows, hourly] = await Promise.all([this.readings.aggregateByShift(), this.readings.hourlyFuel(24)]);

    const furnaces = rows.map((r) => ({
      furnace_id: r.furnace_id,
      furnace_name: r.furnace_name,
      fuel: toNumber(r.fuel),
      electricity: toNumber(r.electricity),
      production: shiftOutput(toNumber(r.output_tph)),
    }));
    const previous = rows.map((r) => ({
      fuel: toNumber(r.prev_fuel),
      electricity: toNumber(r.prev_electricity),
      production: shiftOutput(toNumber(r.prev_output_tph)),
    }));

    const totals = plantTotals(furnaces);
    const before = plantTotals(previous);
    return {
      totals,
      changes: {
        fuel: percentChange(totals.fuel, before.fuel),
        electricity: percentChange(totals.electricity, before.electricity),
        production: percentChange(totals.production, before.production),
      },
      furnaces,
      hourly: hourly.map((h) => ({ hour: h.hour, fuel: toNumber(h.fuel) })),
    };
  }
}
