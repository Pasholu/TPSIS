// Симулятор показаний датчиков: реальных датчиков нет, поэтому показания генерируются
// около базового режима каждой печи. Для подключения оборудования его заменяют источником данных.
export const DEFAULT_PROFILES = Object.freeze({
  1: { temperature: 1447, pressure: -2.4, fuel_consumption: 185.4, o2_percent: 3.2, cao_pct: 64.2, sio2_pct: 20.1, al2o3_pct: 5.8, electricity: 45.3, output_tph: 29.7 },
  2: { temperature: 1462, pressure: -2.2, fuel_consumption: 191.0, o2_percent: 3.5, cao_pct: 63.6, sio2_pct: 20.4, al2o3_pct: 5.9, electricity: 47.1, output_tph: 29.1 },
  3: { temperature: 1492, pressure: -2.9, fuel_consumption: 198.5, o2_percent: 2.7, cao_pct: 64.8, sio2_pct: 19.8, al2o3_pct: 5.7, electricity: 49.0, output_tph: 30.3 },
  4: { temperature: 1425, pressure: -2.0, fuel_consumption: 176.2, o2_percent: 3.9, cao_pct: 63.1, sio2_pct: 20.6, al2o3_pct: 6.1, electricity: 43.2, output_tph: 29.5 },
});

export const NOISE = Object.freeze({
  temperature: 4, pressure: 0.08, fuel_consumption: 1.5, o2_percent: 0.12, cao_pct: 0.15,
  sio2_pct: 0.08, al2o3_pct: 0.05, electricity: 0.6, output_tph: 0.8,
});

const FIELDS = Object.keys(NOISE);
const HISTORY_HOURS = 24;
const HISTORY_STEP_MS = 30 * 60 * 1000;
const KEEP_DAYS = 7;

export class SensorSimulator {
  constructor({ readings, intervalMs = 60000, profiles = DEFAULT_PROFILES, random = Math.random, now = () => new Date() }) {
    this.readings = readings;
    this.intervalMs = intervalMs;
    this.profiles = profiles;
    this.random = random;
    this.now = now;
    this.timer = null;
  }

  next(prev, base) {
    return Object.fromEntries(
      FIELDS.map((f) => [f, prev[f] + (base[f] - prev[f]) * 0.2 + (this.random() * 2 - 1) * NOISE[f]])
    );
  }

  async #lastValues(furnaceId, base) {
    const last = await this.readings.findLatest(furnaceId);
    if (!last) return { time: null, values: { ...base } };
    return {
      time: new Date(last.reading_time).getTime(),
      values: Object.fromEntries(FIELDS.map((f) => [f, last[f] === null ? base[f] : Number(last[f])])),
    };
  }

  // Достраивает историю за последние сутки, если сервер не работал и в показаниях есть пропуск.
  async fillHistory() {
    let added = 0;
    const now = this.now().getTime();
    for (const [id, base] of Object.entries(this.profiles)) {
      const furnaceId = Number(id);
      let { time, values } = await this.#lastValues(furnaceId, base);
      const from = Math.max(time === null ? 0 : time + HISTORY_STEP_MS, now - HISTORY_HOURS * 3600 * 1000);
      for (let t = from; t <= now; t += HISTORY_STEP_MS) {
        values = this.next(values, base);
        await this.readings.insert(furnaceId, new Date(t), values);
        added += 1;
      }
    }
    return added;
  }

  async tick() {
    for (const [id, base] of Object.entries(this.profiles)) {
      const furnaceId = Number(id);
      const { values } = await this.#lastValues(furnaceId, base);
      await this.readings.insert(furnaceId, this.now(), this.next(values, base));
    }
    await this.readings.deleteOlderThan(KEEP_DAYS);
  }

  start() {
    this.timer = setInterval(() => this.tick().catch((err) => console.error('Sensor simulator error:', err.message)), this.intervalMs);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }
}
