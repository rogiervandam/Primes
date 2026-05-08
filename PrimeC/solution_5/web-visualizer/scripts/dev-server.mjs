import { createServer } from 'vite';

const server = await createServer();
await server.listen();

server.config.logger.info('Vite dev server ready.', { clear: false });

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
