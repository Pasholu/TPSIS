const FIELDS = ['temperature', 'pressure', 'fuel_consumption', 'o2_percent', 'cao_pct', 'sio2_pct', 'al2o3_pct', 'electricity', 'output_tph'];

export class SensorReadingRepository {
  constructor(db) {
    this.db = db;
  }

  async findForFurnace(furnaceId, hours) {
    const { rows } = await this.db.query(
      `SELECT reading_time, temperature, pressure, fuel_consumption, o2_percent, cao_pct, sio2_pct, al2o3_pct
       FROM sensor_reading
       WHERE furnace_id = $1 AND reading_time > NOW() - ($2 || ' hours')::interval
       ORDER BY reading_time ASC`,
      [furnaceId, String(hours)]
    );
    return rows;
  }

  async findLatest(furnaceId) {
    const { rows } = await this.db.query(
      `SELECT reading_time, ${FIELDS.join(', ')} FROM sensor_reading
       WHERE furnace_id = $1 ORDER BY reading_time DESC LIMIT 1`,
      [furnaceId]
    );
    return rows[0] ?? null;
  }

  async insert(furnaceId, time, reading) {
    await this.db.query(
      `INSERT INTO sensor_reading (furnace_id, reading_time, ${FIELDS.join(', ')})
       VALUES ($1, $2, ${FIELDS.map((_, i) => `$${i + 3}`).join(', ')})`,
      [furnaceId, time, ...FIELDS.map((f) => reading[f])]
    );
  }

  async deleteOlderThan(days) {
    await this.db.query("DELETE FROM sensor_reading WHERE reading_time < NOW() - ($1 || ' days')::interval", [String(days)]);
  }

  async aggregateByShift() {
    const { rows } = await this.db.query(`
      SELECT f.furnace_id, f.furnace_name,
        AVG(sr.fuel_consumption) FILTER (WHERE sr.reading_time > NOW() - INTERVAL '8 hours') AS fuel,
        AVG(sr.electricity)      FILTER (WHERE sr.reading_time > NOW() - INTERVAL '8 hours') AS electricity,
        AVG(sr.output_tph)       FILTER (WHERE sr.reading_time > NOW() - INTERVAL '8 hours') AS output_tph,
        AVG(sr.fuel_consumption) FILTER (WHERE sr.reading_time <= NOW() - INTERVAL '8 hours') AS prev_fuel,
        AVG(sr.electricity)      FILTER (WHERE sr.reading_time <= NOW() - INTERVAL '8 hours') AS prev_electricity,
        AVG(sr.output_tph)       FILTER (WHERE sr.reading_time <= NOW() - INTERVAL '8 hours') AS prev_output_tph
      FROM furnace f
      LEFT JOIN sensor_reading sr
        ON sr.furnace_id = f.furnace_id AND sr.reading_time > NOW() - INTERVAL '16 hours'
      GROUP BY f.furnace_id, f.furnace_name
      ORDER BY f.furnace_id`);
    return rows;
  }

  async hourlyFuel(hours = 24) {
    const { rows } = await this.db.query(
      `SELECT date_trunc('hour', reading_time) AS hour, AVG(fuel_consumption) AS fuel
       FROM sensor_reading
       WHERE reading_time > NOW() - ($1 || ' hours')::interval
       GROUP BY 1 ORDER BY 1`,
      [String(hours)]
    );
    return rows;
  }
}
