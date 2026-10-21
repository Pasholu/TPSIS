import { NotFoundError, ValidationError } from '../errors.js';
import { toLabSampleDto } from '../dto/labSampleDto.js';

export class LabSampleService {
  constructor({ db, samples, tasks, furnaces, grades, tolerances }) {
    this.db = db;
    this.samples = samples;
    this.tasks = tasks;
    this.furnaces = furnaces;
    this.grades = grades;
    this.tolerances = tolerances;
  }

  async list() {
    return (await this.samples.findAllDetailed()).map(toLabSampleDto);
  }

  async getById(id) {
    const row = await this.samples.findDetailedById(id);
    if (!row) throw new NotFoundError('Проба не найдена');
    return toLabSampleDto(row);
  }

  async register(input) {
    const [furnaceExists, gradeExists] = await Promise.all([
      this.furnaces.exists(input.furnaceId),
      this.grades.exists(input.gradeId),
    ]);
    if (!furnaceExists) throw new ValidationError('Указанная печь не существует');
    if (!gradeExists) throw new ValidationError('Указанная марка цемента не существует');

    const limits = await this.tolerances.getLabLimits();
    const passed = this.tolerances.isPassed(input.cao, input.mgo, limits);

    const row = await this.db.transaction(async (tx) => {
      const task =
        (await this.tasks.findLatestFor(input.furnaceId, input.gradeId, tx)) ??
        (await this.tasks.createActive(input.furnaceId, input.gradeId, tx));
      const sample = await this.samples.create(
        { taskId: task.task_id, code: input.code, cao: input.cao, mgo: input.mgo, notes: input.notes, passed },
        tx
      );
      if (!input.code) await this.samples.assignGeneratedCode(sample.sample_id, tx);
      return this.samples.findDetailedById(sample.sample_id, tx);
    });
    return toLabSampleDto(row);
  }

  async remove(id) {
    if (!(await this.samples.deleteById(id))) throw new NotFoundError('Проба не найдена');
  }
}
