import { NotFoundError, ValidationError } from '../errors.js';
import { toReferenceItem } from '../dto/referenceDto.js';

const fileKey = (id) => `standard-${id}.pdf`;
const isPdf = (data) => Buffer.isBuffer(data) && data.subarray(0, 5).toString('latin1') === '%PDF-';

export class DocumentService {
  constructor({ items, storage }) {
    this.items = items;
    this.storage = storage;
  }

  async attach(id, data, fileName) {
    if (!(await this.items.findInCategory('standards', id))) throw new NotFoundError('Документ не найден');
    if (!Buffer.isBuffer(data) || data.length === 0) throw new ValidationError('Отправьте PDF-файл');
    if (!isPdf(data)) throw new ValidationError('Файл не является PDF');
    await this.storage.save(fileKey(id), data);
    return toReferenceItem(await this.items.setFileName(id, fileName || 'document.pdf'));
  }

  async open(id) {
    const row = await this.items.findInCategory('standards', id);
    if (!row?.file_name) throw new NotFoundError('Файл не прикреплён');
    try {
      return { data: await this.storage.read(fileKey(id)), fileName: row.file_name };
    } catch {
      throw new NotFoundError('Файл не найден на сервере');
    }
  }

  async detach(id) {
    const row = await this.items.setFileName(id, null);
    if (!row) throw new NotFoundError('Документ не найден');
    await this.removeFile(id);
    return toReferenceItem(row);
  }

  removeFile(id) {
    return this.storage.remove(fileKey(id));
  }
}
