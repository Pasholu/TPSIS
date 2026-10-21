# СКК ПП — система контроля качества и производственных процессов

Веб-приложение для цементного завода: дашборд оператора по печам, регистрация лабораторных проб с проверкой допусков, панель энергоэффективности и справочники нормативных данных.

- Клиент: React 18, TypeScript, Vite, Material UI, Recharts (папка `src`).
- Сервер: Node.js 22, Express, REST API (папка `backend`).
- База данных: PostgreSQL.

## Запуск

Нужны Node.js 18+ и PostgreSQL с базой `skk_pp_db` (таблицы `furnace`, `operator`, `laborer`, `cement_grade`, `production_task`, `lab_sample`; остальные таблицы сервер создаёт сам).

```bash
npm install
npm install --prefix backend
copy backend\.env.example backend\.env   # указать пароль от PostgreSQL
```

Затем запустить `start.cmd` (откроются два окна) или вручную в двух терминалах:

```bash
cd backend && npm start     # API: http://localhost:5000/api
npm run dev                 # интерфейс: http://localhost:5173
```

Тесты бизнес-логики сервера: `npm test --prefix backend`.

## Архитектура сервера

```
backend/src/
├── server.js        точка входа: миграции, симулятор датчиков, запуск HTTP
├── container.js     корень композиции: создание объектов и внедрение зависимостей
├── app.js           сборка Express-приложения
├── controllers/     HTTP: маршруты, разбор запроса, коды ответов
├── services/        бизнес-логика: допуски, пробы, справочники, энергоэффективность
├── repositories/    доступ к данным: SQL-запросы
├── dto/             проверка входных данных и формат ответов
├── db/              пул соединений, транзакции, миграции схемы
└── middleware/      обработка ошибок
```

Описание всех маршрутов API — в `backend/README.md`.

Показания датчиков печей генерируются симулятором (`backend/src/services/SensorSimulator.js`), реального оборудования нет. Отключить: `SIMULATE_SENSORS=false` в `backend/.env`.
