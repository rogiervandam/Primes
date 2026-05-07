/**
 * Vite plugin that serves the log directory API.
 *
 * GET  /api/logs                       → JSON array of .sievetrace filenames (newest first)
 * GET  /api/logs/:name                 → raw content of that trace/companion file
 * POST /api/logs/upload?name=:name     → save an uploaded .sievetrace file
 * GET  /api/logs/pending-upload        → newest upload waiting for a UI decision
 * POST /api/logs/pending-upload/:id/ack → clear an upload prompt after user choice
 */
import { handleLogApiRequest, sendJson } from './log-api-utils.mjs';

export function logApiPlugin(logDir) {
  const handler = (req, res, next) => {
    handleLogApiRequest(req, res, logDir, { source: 'dev-server' })
      .then((handled) => {
        if (!handled) next();
      })
      .catch((error) => {
        sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Log API failed' });
      });
  };

  return {
    name: 'log-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
