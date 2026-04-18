/**
 * Vite plugin that serves the log directory API.
 *
 * GET /api/logs         → JSON array of .sievetrace filenames (newest first)
 * GET /api/logs/:name   → raw content of that trace file
 */
import fs from 'fs';
import path from 'path';

export function logApiPlugin(logDir) {
  const handler = (req, res, next) => {
    if (req.url === '/api/logs') {
      try {
        const files = fs.readdirSync(logDir)
          .filter(f => f.endsWith('.sievetrace'))
          .map(f => ({
            name: f,
            mtime: fs.statSync(path.join(logDir, f)).mtimeMs,
          }))
          .sort((a, b) => b.mtime - a.mtime)
          .map(f => f.name);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(files));
      } catch {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify([]));
      }
      return;
    }

    const prefix = '/api/logs/';
    if (req.url?.startsWith(prefix)) {
      const fileName = decodeURIComponent(req.url.slice(prefix.length));
      // Prevent path traversal
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        res.statusCode = 400;
        res.end('Invalid file name');
        return;
      }
      const filePath = path.join(logDir, fileName);
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('File not found');
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    next();
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
