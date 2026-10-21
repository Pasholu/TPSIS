# СКК ПП — серверная часть (REST API)

Node.js + Express + PostgreSQL. Слои: контроллеры → сервисы → репозитории; все зависимости передаются через конструктор и связываются в `src/container.js`.

## Запуск

```bash
npm install
copy .env.example .env    # указать пароль от PostgreSQL
npm start                 # http://localhost:5000/api
npm run dev               # с перезапуском при изменении файлов
npm test                  # модульные тесты бизнес-логики (без базы данных)
```

Переменные `.env`: `DATABASE_URL`, `PORT` (5000), `SIMULATE_SENSORS` (true), `SENSOR_INTERVAL_MS` (60000), `UPLOAD_DIR`.
Спецсимволы в пароле кодируются (`@` -> `%40`).

При старте сервер выполняет идемпотентные миграции (`src/db/DatabaseMigrator.js`): создаёт таблицы `reference_item` и `sensor_reading`, недостающие колонки, начальные справочники и текущее задание для каждой печи. Если сервер не работал, симулятор достраивает показания датчиков за последние 24 часа.

## API

Все ответы — JSON. Ошибки: `{ "error": "текст" }` с кодом 400 (неверные данные), 404 (не найдено), 409 (конфликт), 413 (файл больше 20 МБ), 500.

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/health` | Проверка сервера |
| GET | `/api/furnaces`, `/api/cement-grades`, `/api/operators`, `/api/laborers`, `/api/production-tasks` | Списки |
| GET | `/api/furnaces/:id/current` | Текущее задание печи: оператор, смена, марка |
| GET | `/api/sensor-readings?furnace_id=N&hours=24` | Показания датчиков (1–168 ч) |
| GET | `/api/energy` | Энергоэффективность: текущие 8 ч против предыдущих 8 ч |
| GET | `/api/lab-limits` | Действующие допуски CaO и MgO |
| GET | `/api/lab-samples` | История проб |
| GET | `/api/lab-samples/:id` | Одна проба |
| POST | `/api/lab-samples` | Регистрация пробы, статус «брак» по допускам |
| DELETE | `/api/lab-samples/:id` | Удаление пробы |
| GET | `/api/references` | Все справочники |
| POST / PUT / DELETE | `/api/references/:category[/:id]` | Записи: `cementTypes`, `tempRegimes`, `tolerances`, `recipes`, `standards` |
| PUT / GET / DELETE | `/api/references/standards/:id/file` | PDF нормативного документа (`Content-Type: application/pdf`) |
