import { Pool } from 'pg';

export class Database {
  constructor(connectionString) {
    this.pool = new Pool({ connectionString });
  }

  query(sql, params) {
    return this.pool.query(sql, params);
  }

  async transaction(work) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}
