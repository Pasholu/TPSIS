import { config } from './config.js';
import { createContainer } from './container.js';
import { createApp } from './app.js';

const container = createContainer(config);

try {
  await container.migrator.run();
  if (config.simulateSensors) {
    const added = await container.simulator.fillHistory();
    if (added) console.log(`Sensor history filled: ${added} readings`);
    container.simulator.start();
  }
} catch (err) {
  console.error('Database init error:', err.message);
  console.error('Проверьте, что PostgreSQL запущен и DATABASE_URL в backend/.env указан верно.');
  process.exit(1);
}

const server = createApp(container.controllers).listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`API available at http://localhost:${config.port}/api`);
});

const shutdown = () => {
  container.simulator.stop();
  server.close(() => container.db.close().finally(() => process.exit(0)));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
