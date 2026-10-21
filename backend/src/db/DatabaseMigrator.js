import { DEFAULT_PROFILES, NOISE } from '../services/SensorSimulator.js';

const SEED_REFERENCES = {
  tempRegimes: [
    ['Режим 1', '1400-1450°C', 'Оптимальный режим'],
    ['Режим 2', '1450-1500°C', 'Высокотемпературный режим'],
    ['Режим 3', '1350-1400°C', 'Экономный режим'],
  ],
  tolerances: [
    ['CaO', '62.0-66.0%', 'Допуск содержания оксида кальция'],
    ['SiO2', '19.5-21.0%', 'Допуск содержания диоксида кремния'],
    ['Al2O3', '5.0-6.5%', 'Допуск содержания оксида алюминия'],
    ['MgO', '0.8-1.5%', 'Допуск содержания оксида магния'],
  ],
  recipes: [
    ['Рецепт М500 №1', 'CaCO3:75% Al2O3:18% SiO2:5% Fe2O3:2%', 'Рецептура портландцемента М500'],
    ['Рецепт М400 №1', 'CaCO3:74% Al2O3:18.5% SiO2:5% Fe2O3:2.5%', 'Рецептура портландцемента М400'],
  ],
  standards: [
    ['ГОСТ 10178-85', 'GOST_10178_85', 'Портландцемент и шлакопортландцемент'],
    ['ГОСТ 31108-2016', 'GOST_31108_2016', 'Цемент общестроительный'],
    ['ISO 12989', 'ISO_12989', 'Портландцемент'],
  ],
};

// Изменения схемы идемпотентны: повторный запуск ничего не ломает.
export class DatabaseMigrator {
  constructor({ db, tolerances }) {
    this.db = db;
    this.tolerances = tolerances;
  }

  async run() {
    await this.#schema();
    await this.#seedReferences();
    await this.#migrateLegacySamples();
    await this.#fillLegacyEnergyColumns();
    await this.#ensureTaskPerFurnace();
  }

  #schema() {
    return this.db.query(`
      CREATE TABLE IF NOT EXISTS reference_item (
        item_id     SERIAL PRIMARY KEY,
        category    VARCHAR(20) NOT NULL,
        name        VARCHAR(200) NOT NULL,
        value       VARCHAR(500) NOT NULL,
        description TEXT,
        created_at  TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_reference_item_category ON reference_item (category);
      ALTER TABLE reference_item ADD COLUMN IF NOT EXISTS doc_url VARCHAR(500);
      ALTER TABLE reference_item ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

      ALTER TABLE lab_sample ADD COLUMN IF NOT EXISTS sample_code VARCHAR(50);
      ALTER TABLE lab_sample ADD COLUMN IF NOT EXISTS cao_pct NUMERIC(5,2);
      ALTER TABLE lab_sample ADD COLUMN IF NOT EXISTS mgo_pct NUMERIC(5,2);
      ALTER TABLE lab_sample ADD COLUMN IF NOT EXISTS notes TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_sample_code ON lab_sample (sample_code) WHERE sample_code IS NOT NULL;

      CREATE TABLE IF NOT EXISTS sensor_reading (
        reading_id       SERIAL PRIMARY KEY,
        furnace_id       INTEGER NOT NULL REFERENCES furnace(furnace_id),
        reading_time     TIMESTAMP NOT NULL,
        temperature      NUMERIC(7,2) NOT NULL,
        pressure         NUMERIC(7,2) NOT NULL,
        fuel_consumption NUMERIC(7,2) NOT NULL,
        o2_percent       NUMERIC(5,2) NOT NULL,
        cao_pct          NUMERIC(5,2) NOT NULL,
        sio2_pct         NUMERIC(5,2) NOT NULL,
        al2o3_pct        NUMERIC(5,2) NOT NULL
      );
      ALTER TABLE sensor_reading ADD COLUMN IF NOT EXISTS electricity NUMERIC(7,2);
      ALTER TABLE sensor_reading ADD COLUMN IF NOT EXISTS output_tph NUMERIC(7,2);
      CREATE INDEX IF NOT EXISTS idx_sensor_reading_furnace_time ON sensor_reading (furnace_id, reading_time DESC);
    `);
  }

  async #seedReferences() {
    const { rows } = await this.db.query('SELECT COUNT(*)::int AS n FROM reference_item');
    if (rows[0].n > 0) return;
    for (const [category, items] of Object.entries(SEED_REFERENCES)) {
      for (const [name, value, description] of items) {
        await this.db.query(
          'INSERT INTO reference_item (category, name, value, description) VALUES ($1, $2, $3, $4)',
          [category, name, value, description]
        );
      }
    }
  }

  // Ранние версии хранили CaO/MgO в колонках compress_strength_mpa/moisture_pct.
  async #migrateLegacySamples() {
    const limits = await this.tolerances.getLabLimits();
    const { rows } = await this.db.query(
      'SELECT sample_id, compress_strength_mpa, moisture_pct FROM lab_sample WHERE cao_pct IS NULL AND compress_strength_mpa IS NOT NULL'
    );
    for (const row of rows) {
      const cao = Number(row.compress_strength_mpa);
      const mgo = Number(row.moisture_pct);
      await this.db.query(
        `UPDATE lab_sample SET cao_pct = $2, mgo_pct = $3, passed = $4, compress_strength_mpa = NULL, moisture_pct = NULL
         WHERE sample_id = $1`,
        [row.sample_id, cao, mgo, this.tolerances.isPassed(cao, mgo, limits)]
      );
    }
    await this.db.query(`
      UPDATE lab_sample
      SET sample_code = 'ПР-' || to_char(sample_time, 'YYYY-MM-DD') || '-' || lpad(sample_id::text, 3, '0')
      WHERE sample_code IS NULL`);
  }

  async #fillLegacyEnergyColumns() {
    for (const [furnaceId, base] of Object.entries(DEFAULT_PROFILES)) {
      await this.db.query(
        `UPDATE sensor_reading
         SET electricity = $2::numeric + (random() * 2 - 1) * $3::numeric,
             output_tph  = $4::numeric + (random() * 2 - 1) * $5::numeric
         WHERE furnace_id = $1 AND (electricity IS NULL OR output_tph IS NULL)`,
        [furnaceId, base.electricity, NOISE.electricity, base.output_tph, NOISE.output_tph]
      );
    }
  }

  // У каждой печи должно быть текущее задание, чтобы на дашборде были оператор и марка.
  async #ensureTaskPerFurnace() {
    const furnaces = (await this.db.query('SELECT furnace_id FROM furnace ORDER BY furnace_id')).rows;
    const operators = (await this.db.query('SELECT operator_id FROM operator ORDER BY operator_id')).rows;
    const grades = (await this.db.query('SELECT grade_id FROM cement_grade ORDER BY grade_id')).rows;
    const laborer = (await this.db.query('SELECT laborer_id FROM laborer ORDER BY laborer_id LIMIT 1')).rows[0];
    if (!operators.length || !grades.length) return;
    for (const [i, f] of furnaces.entries()) {
      const has = await this.db.query('SELECT 1 FROM production_task WHERE furnace_id = $1 LIMIT 1', [f.furnace_id]);
      if (has.rows.length > 0) continue;
      await this.db.query(
        `INSERT INTO production_task (furnace_id, operator_id, grade_id, laborer_id, start_time, status)
         VALUES ($1, $2, $3, $4, date_trunc('day', NOW()) + INTERVAL '8 hours', 'active')`,
        [f.furnace_id, operators[i % operators.length].operator_id, grades[(i + 2) % grades.length].grade_id, laborer?.laborer_id ?? null]
      );
    }
  }
}
