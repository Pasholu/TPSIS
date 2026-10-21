import { BaseRepository } from './BaseRepository.js';
import { ConflictError } from '../errors.js';

const DETAILED = `
  SELECT ls.sample_id, ls.sample_code, ls.sample_time, ls.cao_pct, ls.mgo_pct, ls.notes, ls.passed,
         f.furnace_id, f.furnace_name, cg.grade_name
  FROM lab_sample ls
  LEFT JOIN production_task pt ON pt.task_id = ls.task_id
  LEFT JOIN furnace f ON f.furnace_id = pt.furnace_id
  LEFT JOIN cement_grade cg ON cg.grade_id = pt.grade_id`;

export class LabSampleRepository extends BaseRepository {
  constructor(db) {
    super(db, 'lab_sample', 'sample_id');
  }

  async findAllDetailed() {
    const { rows } = await this.db.query(`${DETAILED} ORDER BY ls.sample_time DESC, ls.sample_id DESC`);
    return rows;
  }

  async findDetailedById(id, exec = this.db) {
    const { rows } = await exec.query(`${DETAILED} WHERE ls.sample_id = $1`, [id]);
    return rows[0] ?? null;
  }

  async create({ taskId, code, cao, mgo, notes, passed }, exec = this.db) {
    try {
      const { rows } = await exec.query(
        `INSERT INTO lab_sample (task_id, sample_time, sample_code, cao_pct, mgo_pct, notes, passed)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6) RETURNING *`,
        [taskId, code, cao, mgo, notes, passed]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') throw new ConflictError('Проба с таким ID уже существует');
      throw err;
    }
  }

  async assignGeneratedCode(id, exec = this.db) {
    await exec.query(
      `UPDATE lab_sample
       SET sample_code = 'ПР-' || to_char(sample_time, 'YYYY-MM-DD') || '-' || lpad(sample_id::text, 3, '0')
       WHERE sample_id = $1`,
      [id]
    );
  }
}
