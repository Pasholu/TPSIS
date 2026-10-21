import fs from 'fs/promises';
import path from 'path';

export class LocalFileStorage {
  constructor(dir) {
    this.dir = dir;
  }

  async save(name, data) {
    await fs.mkdir(this.dir, { recursive: true });
    await fs.writeFile(this.#path(name), data);
  }

  read(name) {
    return fs.readFile(this.#path(name));
  }

  remove(name) {
    return fs.rm(this.#path(name), { force: true });
  }

  #path(name) {
    return path.join(this.dir, path.basename(name));
  }
}
