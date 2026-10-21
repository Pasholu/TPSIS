import { BaseRepository } from './BaseRepository.js';

export class FurnaceRepository extends BaseRepository {
  constructor(db) {
    super(db, 'furnace', 'furnace_id');
  }

  async findCurrentState(id) {
    const { rows } = await this.db.query(
      `SELECT f.furnace_id, f.furnace_name, f.status AS furnace_status,
              pt.task_id, pt.start_time, o.full_name AS operator_name, o.shift AS operator_shift, cg.grade_name
       FROM furnace f
       LEFT JOIN LATERAL (
         SELECT * FROM production_task WHERE furnace_id = f.furnace_id ORDER BY start_time DESC LIMIT 1
       ) pt ON true
       LEFT JOIN operator o ON o.operator_id = pt.operator_id
       LEFT JOIN cement_grade cg ON cg.grade_id = pt.grade_id
       WHERE f.furnace_id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }
}
