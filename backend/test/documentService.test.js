import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { DocumentService } from '../src/services/DocumentService.js';
import { LocalFileStorage } from '../src/services/LocalFileStorage.js';
import { NotFoundError, ValidationError } from '../src/errors.js';
import { pdfBytes } from './helpers/fakes.js';

const makeService = ({ hasDoc = true, fileName = null } = {}) => {
  const files = new Map();
  const row = { item_id: 5, category: 'standards', name: 'ГОСТ 31108', value: 'G', file_name: fileName };
  const items = {
    findInCategory: async (c, id) => (hasDoc && id === 5 && c === 'standards' ? row : null),
    setFileName: async (id, name) => (hasDoc && id === 5 ? Object.assign(row, { file_name: name }) : null),
  };
  const storage = {
    save: async (n, d) => files.set(n, d),
    read: async (n) => {
      if (!files.has(n)) throw new Error('ENOENT');
      return files.get(n);
    },
    remove: async (n) => files.delete(n),
  };
  return { service: new DocumentService({ items, storage }), files, row };
};

describe('Класс DocumentService (PDF нормативных документов)', () => {
  it('прикрепляет PDF и помечает запись', async () => {
    const { service, files } = makeService();
    const item = await service.attach(5, pdfBytes(), 'ГОСТ.pdf');
    assert.equal(item.hasFile, true);
    assert.equal(item.fileName, 'ГОСТ.pdf');
    assert.ok(files.has('standard-5.pdf'));
    assert.equal((await service.attach(5, pdfBytes())).fileName, 'document.pdf');
  });

  it('отклоняет пустой файл, файл не PDF и несуществующий документ', async () => {
    const { service } = makeService();
    await assert.rejects(service.attach(5, Buffer.alloc(0)), /Отправьте PDF-файл/);
    await assert.rejects(service.attach(5, Buffer.from('hello world')), /не является PDF/);
    await assert.rejects(service.attach(5, {}), ValidationError);
    await assert.rejects(makeService({ hasDoc: false }).service.attach(5, pdfBytes()), NotFoundError);
  });

  it('открывает прикреплённый файл и сообщает, если файла нет', async () => {
    const { service } = makeService();
    await assert.rejects(service.open(5), /не прикреплён/);
    await service.attach(5, pdfBytes(), 'a.pdf');
    assert.equal((await service.open(5)).fileName, 'a.pdf');

    const lost = makeService({ fileName: 'b.pdf' });
    await assert.rejects(lost.service.open(5), /не найден на сервере/);
  });

  it('открепляет файл и удаляет его из хранилища', async () => {
    const { service, files } = makeService();
    await service.attach(5, pdfBytes(), 'a.pdf');
    assert.equal((await service.detach(5)).hasFile, false);
    assert.equal(files.size, 0);
    await assert.rejects(makeService({ hasDoc: false }).service.detach(5), NotFoundError);
  });
});

describe('Класс LocalFileStorage (файловое хранилище)', () => {
  it('сохраняет, читает и удаляет файл, не выходя за пределы каталога', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'skk-'));
    const storage = new LocalFileStorage(path.join(dir, 'uploads'));
    await storage.save('../../evil.pdf', pdfBytes());
    assert.deepEqual(await fs.readdir(path.join(dir, 'uploads')), ['evil.pdf']);
    assert.equal((await storage.read('evil.pdf')).subarray(0, 5).toString(), '%PDF-');
    await storage.remove('evil.pdf');
    await storage.remove('evil.pdf');
    await assert.rejects(storage.read('evil.pdf'));
    await fs.rm(dir, { recursive: true, force: true });
  });
});
