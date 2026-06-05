/**
 * Vite plugin that serves the log directory API and the sieve Docker runner API.
 *
 * GET  /api/logs                       → JSON array of .sievetrace filenames (newest first)
 * GET  /api/logs/:name                 → raw content of that trace/companion file
 * POST /api/logs/upload?name=:name     → save an uploaded .sievetrace file
 * GET  /api/logs/pending-upload        → newest upload waiting for a UI decision
 * POST /api/logs/pending-upload/:id/ack → clear an upload prompt after user choice
 *
 * GET  /api/sieve/status              → Docker availability + variant list
 * POST /api/sieve/run                 → launch a trace job in a Docker container
 * GET  /api/sieve/jobs                → list recent jobs
 * GET  /api/sieve/jobs/:id            → single job status
 * POST /api/sieve/jobs/:id/cancel     → cancel a running job
 */
import { handleLogApiRequest, sendJson } from './log-api-utils.mjs';
import { handleSieveApiRequest } from './sieve-docker-api.mjs';

export function logApiPlugin(logDir) {
  const handler = (req, res, next) => {
    const url = req.url || '/';
    // Route /api/sieve/* to the Docker runner; everything else to the log API.
    if (url.startsWith('/api/sieve')) {
      handleSieveApiRequest(req, res, logDir)
        .then((handled) => {
          if (!handled) next();
        })
        .catch((error) => {
          sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Sieve API failed' });
        });
      return;
    }
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
