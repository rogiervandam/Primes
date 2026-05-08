import fs from 'fs';
import path from 'path';

const DEFAULT_MAX_UPLOAD_BYTES = 512 * 1024 * 1024;
const pendingUploads = [];

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function isSafeLogFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return false;
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) return false;
  return path.basename(fileName) === fileName;
}

export function isUploadTraceFileName(fileName) {
  return isSafeLogFileName(fileName) && fileName.endsWith('.sievetrace');
}

export function listTraceFiles(logDir) {
  return fs.readdirSync(logDir)
    .filter((fileName) => fileName.endsWith('.sievetrace'))
    .map((fileName) => ({
      name: fileName,
      mtime: fs.statSync(path.join(logDir, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((file) => file.name);
}

export function uniqueLogFileName(logDir, fileName) {
  const parsed = path.parse(fileName);
  let candidate = fileName;
  let counter = 1;
  while (fs.existsSync(path.join(logDir, candidate))) {
    candidate = `${parsed.name}-${counter}${parsed.ext}`;
    counter += 1;
  }
  return candidate;
}

export function getPendingUpload() {
  return pendingUploads[0] || null;
}

export function ackPendingUpload(id) {
  const index = pendingUploads.findIndex((upload) => upload.id === id);
  if (index >= 0) {
    pendingUploads.splice(index, 1);
    return true;
  }
  return false;
}

export function saveUploadedTrace(logDir, requestedName, data, source = 'upload') {
  if (!isUploadTraceFileName(requestedName)) {
    const error = new Error('Invalid trace file name');
    error.statusCode = 400;
    throw error;
  }

  fs.mkdirSync(logDir, { recursive: true });
  const savedName = uniqueLogFileName(logDir, requestedName);
  fs.writeFileSync(path.join(logDir, savedName), data);

  const upload = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: savedName,
    requestedName,
    size: data.length,
    source,
    uploadedAt: new Date().toISOString(),
  };
  pendingUploads.push(upload);
  return upload;
}

export async function handleLogApiRequest(req, res, logDir, options = {}) {
  const method = req.method || 'GET';
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/logs' && method === 'GET') {
    try {
      sendJson(res, 200, listTraceFiles(logDir));
    } catch {
      sendJson(res, 200, []);
    }
    return true;
  }

  if (pathname === '/api/logs/upload' && method === 'POST') {
    try {
      const requestedName = parsedUrl.searchParams.get('name') || req.headers['x-sieve-trace-filename'];
      const data = await readRequestBody(req, uploadLimit(options));
      const upload = saveUploadedTrace(logDir, requestedName, data, options.source || 'api');
      sendJson(res, 200, { ok: true, name: upload.name, pendingId: upload.id, upload });
    } catch (error) {
      sendJson(res, error.statusCode || 500, { ok: false, error: error.message || 'Upload failed' });
    }
    return true;
  }

  if (pathname === '/api/logs/pending-upload' && method === 'GET') {
    sendJson(res, 200, { upload: getPendingUpload() });
    return true;
  }

  const ackPrefix = '/api/logs/pending-upload/';
  const ackSuffix = '/ack';
  if (pathname.startsWith(ackPrefix) && pathname.endsWith(ackSuffix) && method === 'POST') {
    const id = decodeURIComponent(pathname.slice(ackPrefix.length, -ackSuffix.length));
    sendJson(res, 200, { ok: true, acknowledged: ackPendingUpload(id) });
    return true;
  }

  const filePrefix = '/api/logs/';
  if (pathname.startsWith(filePrefix) && method === 'GET') {
    const fileName = decodeURIComponent(pathname.slice(filePrefix.length));
    if (!isSafeLogFileName(fileName)) {
      res.statusCode = 400;
      res.end('Invalid file name');
      return true;
    }

    const filePath = path.join(logDir, fileName);
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end('File not found');
      return true;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', fileName.endsWith('.json') ? 'application/json' : 'text/plain; charset=utf-8');
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  return false;
}

function uploadLimit(options) {
  const fromOptions = Number(options.maxUploadBytes);
  if (Number.isFinite(fromOptions) && fromOptions > 0) return fromOptions;

  const fromEnv = Number(process.env.SIEVE_TRACE_UPLOAD_MAX_BYTES);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  return DEFAULT_MAX_UPLOAD_BYTES;
}

function readRequestBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    let settled = false;

    req.on('data', (chunk) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        settled = true;
        const error = new Error(`Upload exceeds ${maxBytes} bytes`);
        error.statusCode = 413;
        reject(error);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
  });
}