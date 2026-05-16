/**
 * Sieve Docker Runner API
 *
 * Provides server-side endpoints for launching PrimeC/solution_5 sieve
 * containers with custom parameters and monitoring their progress.
 *
 * All logic is intentionally isolated in this file so it does not affect
 * the main log-api code path.
 *
 * Endpoints:
 *   GET  /api/sieve/status          → { dockerAvailable, imageAvailable, variants }
 *   POST /api/sieve/run             → body { variant, sieveSize, traceLevel? }
 *                                     → { jobId, status, message }
 *   GET  /api/sieve/jobs            → array of recent job descriptors
 *   GET  /api/sieve/jobs/:id        → single job descriptor
 *   POST /api/sieve/jobs/:id/cancel → cancel a running job
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Accepted sieve variant names (mirrors SIEVEVARIANTS in the sieve script). */
const VALID_VARIANTS = [
  'sieve_classic8',
  'sieve_classic64',
  'sieve_base',
  'sieve_wheel',
  'sieve_wheel_8of30',
  'sieve_wheelstorage',
  'sieve_extend',
];

/** Docker image that must be pre-built (`./sieve docker default` or `docker build -t sieve_default .`) */
const DOCKER_IMAGE = 'sieve_default';

/** Maximum sieve_size the API will accept. */
const MAX_SIEVE_SIZE = 10_000_000;

/** Minimum sieve_size the API will accept. */
const MIN_SIEVE_SIZE = 10;

/** Valid trace levels accepted by the sieve script (5–9). */
const VALID_TRACE_LEVELS = [5, 6, 7, 8, 9];
const DEFAULT_TRACE_LEVEL = 9;

/** Max concurrent jobs. */
const MAX_CONCURRENT_JOBS = 3;

/** Keep the last N completed/failed jobs in memory. */
const MAX_HISTORY = 20;

/** Job timeout in milliseconds (5 minutes). */
const JOB_TIMEOUT_MS = 5 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// In-memory job store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, variant: string, sieveSize: number, traceLevel: number,
 *   status: 'running'|'completed'|'failed'|'cancelled',
 *   outputFile: string|null, startedAt: string, endedAt: string|null,
 *   logs: string[], process: import('child_process').ChildProcess|null }} Job
 */

/** @type {Job[]} */
const jobs = [];

function makeJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findJob(id) {
  return jobs.find((j) => j.id === id) || null;
}

function countRunning() {
  return jobs.filter((j) => j.status === 'running').length;
}

function pruneHistory() {
  const finished = jobs.filter((j) => j.status !== 'running');
  while (finished.length > MAX_HISTORY) {
    const oldest = finished.shift();
    const idx = jobs.indexOf(oldest);
    if (idx >= 0) jobs.splice(idx, 1);
  }
}

/** Serialise a job for JSON responses (omit the child-process handle). */
function serializeJob(job) {
  const { process: _proc, ...rest } = job;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Docker helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether the `docker` command is available on PATH.
 * Returns true/false synchronously via a best-effort cache; the first call
 * is async and subsequent calls use the cached value.
 */
let dockerAvailableCache = /** @type {boolean|null} */ (null);
let imageAvailableCache = /** @type {boolean|null} */ (null);

export async function checkDockerStatus() {
  const dockerAvailable = await new Promise((resolve) => {
    const proc = spawn('docker', ['version', '--format', '{{.Server.Version}}'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    proc.on('exit', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });

  dockerAvailableCache = dockerAvailable;

  if (!dockerAvailable) {
    imageAvailableCache = false;
    return { dockerAvailable: false, imageAvailable: false };
  }

  const imageAvailable = await new Promise((resolve) => {
    const proc = spawn('docker', ['image', 'inspect', DOCKER_IMAGE], {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    proc.on('exit', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });

  imageAvailableCache = imageAvailable;
  return { dockerAvailable, imageAvailable };
}

// ─────────────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate and parse the `POST /api/sieve/run` body.
 * Returns `{ variant, sieveSize, traceLevel }` or throws with `statusCode`.
 */
function validateRunRequest(body) {
  const { variant, sieveSize, traceLevel } = body;

  if (!VALID_VARIANTS.includes(variant)) {
    const err = new Error(
      `Invalid variant "${variant}". Must be one of: ${VALID_VARIANTS.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  const size = Number(sieveSize);
  if (!Number.isInteger(size) || size < MIN_SIEVE_SIZE || size > MAX_SIEVE_SIZE) {
    const err = new Error(
      `sieveSize must be an integer between ${MIN_SIEVE_SIZE} and ${MAX_SIEVE_SIZE}`
    );
    err.statusCode = 400;
    throw err;
  }

  const level = traceLevel == null ? DEFAULT_TRACE_LEVEL : Number(traceLevel);
  if (!VALID_TRACE_LEVELS.includes(level)) {
    const err = new Error(`traceLevel must be one of: ${VALID_TRACE_LEVELS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  return { variant, sieveSize: size, traceLevel: level };
}

// ─────────────────────────────────────────────────────────────────────────────
// Job runner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start a Docker sieve job.
 *
 * @param {string} variant
 * @param {number} sieveSize
 * @param {number} traceLevel
 * @param {string} logDir   Absolute path on the host that is mounted into the container.
 * @returns {Job}
 */
export function startSieveJob(variant, sieveSize, traceLevel, logDir) {
  // Build the output filename in the same format as the native sieve script.
  const ts = new Date().toISOString().replace(/T/, '_').replace(/:(\d{2})\.\d+Z$/, '').replace(/:/g, '-').slice(0, 16);
  const outputFile = `${ts}_${variant}_trace_${sieveSize}.sievetrace`;

  // Ensure log dir exists on the host (Docker bind-mount target must pre-exist).
  mkdirSync(logDir, { recursive: true });

  const job = {
    id: makeJobId(),
    variant,
    sieveSize,
    traceLevel,
    status: 'running',
    outputFile,
    startedAt: new Date().toISOString(),
    endedAt: null,
    logs: [],
    process: null,
  };

  jobs.push(job);

  // Docker args — all values come from validated/whitelisted sources.
  // Note: the sieve entrypoint is `./sieve`, so we pass sieve-script sub-commands.
  const dockerArgs = [
    'run',
    '--rm',
    '--name', `sieve-runner-${job.id}`,
    // Mount host log directory so the trace file is written there directly.
    '-v', `${logDir}:/home/sieve/log`,
    // Prevent the auto-benchmark shortcut that the sieve script triggers when
    // running inside Docker without DOCKERFILE_TYPE.
    '-e', 'DOCKERFILE_TYPE=runner',
    DOCKER_IMAGE,
    // sieve sub-command: `trace <level> <variant> <sieveSize> trace-filename <file>`
    'trace', String(traceLevel),
    variant,
    String(sieveSize),
    'trace-filename', outputFile,
  ];

  const proc = spawn('docker', dockerArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  job.process = proc;

  const appendLog = (text) => {
    const lines = text.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) job.logs.push(line);
    }
    // Cap log buffer to avoid unbounded growth.
    if (job.logs.length > 500) job.logs.splice(0, job.logs.length - 500);
  };

  proc.stdout.on('data', appendLog);
  proc.stderr.on('data', appendLog);

  const finish = (status) => {
    job.status = status;
    job.endedAt = new Date().toISOString();
    job.process = null;
    clearTimeout(timeout);
    pruneHistory();
  };

  proc.on('exit', (code) => {
    if (job.status !== 'running') return; // already cancelled
    finish(code === 0 ? 'completed' : 'failed');
  });

  proc.on('error', (err) => {
    if (job.status !== 'running') return;
    job.logs.push(`[spawn error] ${err.message}`);
    finish('failed');
  });

  // Safety timeout — kill the container if it runs too long.
  const timeout = setTimeout(() => {
    if (job.status !== 'running') return;
    job.logs.push('[timeout] Job exceeded maximum allowed duration and was killed.');
    proc.kill('SIGTERM');
    // Give it a moment then force-kill the named container.
    setTimeout(() => {
      spawn('docker', ['stop', `sieve-runner-${job.id}`], { stdio: 'ignore' });
    }, 5000);
    finish('failed');
  }, JOB_TIMEOUT_MS);

  return job;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request handler
// ─────────────────────────────────────────────────────────────────────────────

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 64 * 1024) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Handle all `/api/sieve/` requests.
 * Returns `true` when handled, `false` to fall through to the next middleware.
 */
export async function handleSieveApiRequest(req, res, logDir) {
  const method = req.method || 'GET';
  const parsedUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = parsedUrl.pathname;

  if (!pathname.startsWith('/api/sieve')) return false;

  // ── GET /api/sieve/status ─────────────────────────────────────────────────
  if (pathname === '/api/sieve/status' && method === 'GET') {
    try {
      const status = await checkDockerStatus();
      sendJson(res, 200, { ...status, variants: VALID_VARIANTS, imageName: DOCKER_IMAGE });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
    return true;
  }

  // ── GET /api/sieve/jobs ───────────────────────────────────────────────────
  if (pathname === '/api/sieve/jobs' && method === 'GET') {
    sendJson(res, 200, jobs.map(serializeJob));
    return true;
  }

  // ── POST /api/sieve/run ───────────────────────────────────────────────────
  if (pathname === '/api/sieve/run' && method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const { variant, sieveSize, traceLevel } = validateRunRequest(body);

      if (countRunning() >= MAX_CONCURRENT_JOBS) {
        const err = new Error(
          `Too many concurrent jobs (max ${MAX_CONCURRENT_JOBS}). Wait for one to complete.`
        );
        err.statusCode = 429;
        throw err;
      }

      // Quick Docker availability check (use cached value after first call).
      if (dockerAvailableCache === false) {
        sendJson(res, 503, { ok: false, error: 'Docker is not available on this server.' });
        return true;
      }
      if (imageAvailableCache === false) {
        sendJson(res, 503, {
          ok: false,
          error: `Docker image "${DOCKER_IMAGE}" not found. Build it with: ./sieve docker default`,
        });
        return true;
      }

      const job = startSieveJob(variant, sieveSize, traceLevel, logDir);
      sendJson(res, 200, { ok: true, jobId: job.id, outputFile: job.outputFile, job: serializeJob(job) });
    } catch (err) {
      sendJson(res, err.statusCode || 500, { ok: false, error: err.message });
    }
    return true;
  }

  // ── POST /api/sieve/jobs/:id/cancel ──────────────────────────────────────
  const cancelMatch = pathname.match(/^\/api\/sieve\/jobs\/([^/]+)\/cancel$/);
  if (cancelMatch && method === 'POST') {
    const id = decodeURIComponent(cancelMatch[1]);
    const job = findJob(id);
    if (!job) {
      sendJson(res, 404, { ok: false, error: 'Job not found' });
      return true;
    }
    if (job.status !== 'running') {
      sendJson(res, 200, { ok: true, job: serializeJob(job) });
      return true;
    }
    job.status = 'cancelled';
    job.endedAt = new Date().toISOString();
    job.logs.push('[cancelled] Job cancelled by user.');
    if (job.process) {
      job.process.kill('SIGTERM');
      spawn('docker', ['stop', `sieve-runner-${job.id}`], { stdio: 'ignore' });
      job.process = null;
    }
    pruneHistory();
    sendJson(res, 200, { ok: true, job: serializeJob(job) });
    return true;
  }

  // ── GET /api/sieve/jobs/:id ───────────────────────────────────────────────
  const jobMatch = pathname.match(/^\/api\/sieve\/jobs\/([^/]+)$/);
  if (jobMatch && method === 'GET') {
    const id = decodeURIComponent(jobMatch[1]);
    const job = findJob(id);
    if (!job) {
      sendJson(res, 404, { ok: false, error: 'Job not found' });
      return true;
    }
    sendJson(res, 200, serializeJob(job));
    return true;
  }

  return false;
}
