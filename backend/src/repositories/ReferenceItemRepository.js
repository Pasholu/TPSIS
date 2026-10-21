import { BaseRepository } from './BaseRepository.js';

export class ReferenceItemRepository extends BaseRepository {
  constructor(db) {
    super(db, 'reference_item', 'item_id');
  }

  async findByCategory(category) {
    const { rows } = await this.db.query('SELECT * FROM reference_item WHERE category = $1 ORDER BY item_id', [category]);
    return rows;
  }

  async findInCategory(category, id) {
    const { rows } = await this.db.query('SELECT * FROM reference_item WHERE category = $1 AND item_id = $2', [category, id]);
    return rows[0] ?? null;
  }

  async create(category, { name, value, description, url }) {
    const { rows } = await this.db.query(
      'INSERT INTO reference_item (category, name, value, description, doc_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [category, name, value, description, url]
    );
    return rows[0];
  }

  async update(category, id, { name, value, description, url }) {
    const { rows } = await this.db.query(
      `UPDATE reference_item SET name = $1, value = $2, description = $3, doc_url = $4
       WHERE item_id = $5 AND category = $6 RETURNING *`,
      [name, value, description, url, id, category]
    );
    return rows[0] ?? null;
  }

  async deleteInCategory(category, id) {
    const result = await this.db.query('DELETE FROM reference_item WHERE item_id = $1 AND category = $2', [id, category]);
    return result.rowCount > 0;
  }

  async setFileName(id, fileName) {
    const { rows } = await this.db.query(
      "UPDATE reference_item SET file_name = $1 WHERE item_id = $2 AND category = 'standards' RETURNING *",
      [fileName, id]
    );
    return rows[0] ?? null;
  }
}
