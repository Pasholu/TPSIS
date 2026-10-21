// Имена таблиц и колонок задаются только в коде (не из запроса), поэтому их подстановка в SQL безопасна.
export class BaseRepository {
  constructor(db, table, idColumn, orderBy = idColumn) {
    this.db = db;
    this.table = table;
    this.idColumn = idColumn;
    this.orderBy = orderBy;
  }

  async findAll(exec = this.db) {
    const { rows } = await exec.query(`SELECT * FROM ${this.table} ORDER BY ${this.orderBy}`);
    return rows;
  }

  async findById(id, exec = this.db) {
    const { rows } = await exec.query(`SELECT * FROM ${this.table} WHERE ${this.idColumn} = $1`, [id]);
    return rows[0] ?? null;
  }

  async exists(id, exec = this.db) {
    return (await this.findById(id, exec)) !== null;
  }

  async deleteById(id, exec = this.db) {
    const result = await exec.query(`DELETE FROM ${this.table} WHERE ${this.idColumn} = $1`, [id]);
    return result.rowCount > 0;
  }
}
