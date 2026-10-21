import { BaseRepository } from './BaseRepository.js';
import { ConflictError } from '../errors.js';

export class CementGradeRepository extends BaseRepository {
  constructor(db) {
    super(db, 'cement_grade', 'grade_id');
  }

  async create({ name, standard, strength, price }) {
    const { rows } = await this.db.query(
      `INSERT INTO cement_grade (grade_name, standard_code, compress_strength_mpa, price_per_ton)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, standard, strength, price]
    );
    return rows[0];
  }

  async update(id, { name, standard, strength, price }) {
    const { rows } = await this.db.query(
      `UPDATE cement_grade SET grade_name = $1, standard_code = $2, compress_strength_mpa = $3, price_per_ton = $4
       WHERE grade_id = $5 RETURNING *`,
      [name, standard, strength, price, id]
    );
    return rows[0] ?? null;
  }

  async deleteById(id) {
    try {
      return await super.deleteById(id);
    } catch (err) {
      if (err.code === '23503') throw new ConflictError('Марка используется в производственных заданиях и не может быть удалена');
      throw err;
    }
  }
}
