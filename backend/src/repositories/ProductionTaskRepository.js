import { BaseRepository } from './BaseRepository.js';

export class ProductionTaskRepository extends BaseRepository {
  constructor(db) {
    super(db, 'production_task', 'task_id', 'start_time DESC');
  }

  async findAllDetailed() {
    const { rows } = await this.db.query(
      `SELECT pt.*, f.furnace_name, o.full_name AS operator_name, cg.grade_name, l.full_name AS laborer_name
       FROM production_task pt
       LEFT JOIN furnace f ON pt.furnace_id = f.furnace_id
       LEFT JOIN operator o ON pt.operator_id = o.operator_id
       LEFT JOIN cement_grade cg ON pt.grade_id = cg.grade_id
       LEFT JOIN laborer l ON pt.laborer_id = l.laborer_id
       ORDER BY pt.start_time DESC`
    );
    return rows;
  }

  async findLatestFor(furnaceId, gradeId, exec = this.db) {
    const { rows } = await exec.query(
      'SELECT * FROM production_task WHERE furnace_id = $1 AND grade_id = $2 ORDER BY start_time DESC LIMIT 1',
      [furnaceId, gradeId]
    );
    return rows[0] ?? null;
  }

  // Новое задание наследует оператора и лаборанта текущей смены печи; если заданий ещё не было, берутся первые из списка.
  async createActive(furnaceId, gradeId, exec = this.db) {
    const { rows } = await exec.query(
      `WITH cur AS (
         SELECT operator_id, laborer_id FROM production_task WHERE furnace_id = $1 ORDER BY start_time DESC LIMIT 1
       )
       INSERT INTO production_task (furnace_id, operator_id, grade_id, laborer_id, start_time, status)
       VALUES ($1,
               COALESCE((SELECT operator_id FROM cur), (SELECT operator_id FROM operator ORDER BY operator_id LIMIT 1)),
               $2,
               COALESCE((SELECT laborer_id FROM cur), (SELECT laborer_id FROM laborer ORDER BY laborer_id LIMIT 1)),
               NOW(), 'active')
       RETURNING *`,
      [furnaceId, gradeId]
    );
    return rows[0];
  }
}
