// Поддельные зависимости для модульных тестов: сервисы и репозитории получают их через конструктор.

/**
 * База данных в памяти: на каждый SQL-запрос возвращает ответ первого подходящего обработчика
 * и запоминает все выполненные запросы.
 * @param {Array<[RegExp, (params: any[]) => any]>} handlers
 */
export const fakeDb = (handlers = []) => {
  const calls = [];
  const db = {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      for (const [pattern, reply] of handlers) {
        if (pattern.test(sql)) {
          const result = reply(params);
          if (result instanceof Error) throw result;
          return Array.isArray(result) ? { rows: result, rowCount: result.length } : result;
        }
      }
      return { rows: [], rowCount: 0 };
    },
    async transaction(work) {
      return work(db);
    },
  };
  return db;
};

export const pgError = (code, message = 'pg error') => Object.assign(new Error(message), { code });

export const pdfBytes = () => Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
