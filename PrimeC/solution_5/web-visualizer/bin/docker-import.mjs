#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

const DEFAULT_VISUALIZER = 'http://localhost:5173';
const DEFAULT_PATTERN = '*.sievetrace';
const DEFAULT_LOG_DIRS = ['/app/log', '/log', '/logs', '/output', '/tmp'];
const LOG_DIR_LABELS = [
  'org.primes.visualizer.log-dir',
  'primes.visualizer.log-dir',
  'sieve.visualizer.log-dir',
];
const LOG_DIR_ENVS = ['SIEVE_TRACE_DIR', 'TRACE_DIR', 'LOG_DIR'];

export function parseArgs(argv) {
  const options = {
    containers: [],
    image: null,
    imageArgs: [],
    visualizer: DEFAULT_VISUALIZER,
    pattern: DEFAULT_PATTERN,
    containerLogDirs: [],
    stagingDir: null,
    outputDir: null,
    upload: true,
    dryRun: false,
    keepStaging: false,
    removeContainer: false,
    name: null,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      options.imageArgs = argv.slice(index + 1);
      break;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--container') {
      options.containers.push(requireValue(argv, ++index, arg));
      continue;
    }
    if (arg === '--image') {
      options.image = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--name') {
      options.name = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--visualizer' || arg === '--api') {
      options.visualizer = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--container-log-dir' || arg === '--log-dir') {
      options.containerLogDirs.push(requireValue(argv, ++index, arg));
      continue;
    }
    if (arg === '--pattern') {
      options.pattern = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--staging-dir') {
      options.stagingDir = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = requireValue(argv, ++index, arg);
      continue;
    }
    if (arg === '--no-upload') {
      options.upload = false;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--keep-staging') {
      options.keepStaging = true;
      continue;
    }
    if (arg === '--remove-container') {
      options.removeContainer = true;
      continue;
    }
    if (arg === '--verbose') {
      options.verbose = true;
      continue;
    }
    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.containers.push(arg);
  }

  return options;
}

export function candidateLogDirs(inspectInfo, explicitDirs = []) {
  const labels = inspectInfo?.Config?.Labels || {};
  const env = parseEnv(inspectInfo?.Config?.Env || []);
  const workingDir = inspectInfo?.Config?.WorkingDir || '';
  const dirs = [];

  dirs.push(...explicitDirs);
  for (const label of LOG_DIR_LABELS) {
    if (labels[label]) dirs.push(labels[label]);
  }
  for (const envName of LOG_DIR_ENVS) {
    if (env[envName]) dirs.push(env[envName]);
  }
  if (workingDir) dirs.push(path.posix.join(workingDir, 'log'));
  dirs.push(...DEFAULT_LOG_DIRS);

  return Array.from(new Set(dirs.filter(Boolean).map((dir) => normalizeContainerPath(dir))));
}

export function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const createdContainers = [];
  if (options.image) {
    const containerName = options.name || `sieve-trace-import-${Date.now()}`;
    runDocker(['create', '--name', containerName, options.image, ...options.imageArgs], options);
    createdContainers.push(containerName);
    options.containers.push(containerName);
    const start = runDocker(['start', '-a', containerName], { ...options, allowFailure: true, inherit: true });
    if (start.status !== 0) {
      console.error(`Container ${containerName} exited with status ${start.status}; attempting log import anyway.`);
    }
  }

  if (options.containers.length === 0) {
    throw new Error('Provide at least one container name/id, or use --image IMAGE -- <args>.');
  }

  const stagingRoot = options.stagingDir
    ? path.resolve(options.stagingDir)
    : fs.mkdtempSync(path.join(os.tmpdir(), 'sieve-docker-import-'));
  fs.mkdirSync(stagingRoot, { recursive: true });

  try {
    const collected = [];
    for (const container of options.containers) {
      const inspectInfo = inspectContainer(container, options);
      const dirs = candidateLogDirs(inspectInfo, options.containerLogDirs);
      if (options.dryRun) {
        console.log(`${container}: would search ${dirs.join(', ')} for ${options.pattern}`);
        continue;
      }
      collected.push(...collectContainerFiles(container, inspectInfo, dirs, options.pattern, stagingRoot, options));
    }

    const finalFiles = options.outputDir
      ? copyToOutputDir(collected, options.outputDir)
      : collected;

    if (options.upload) {
      for (const filePath of finalFiles) {
        const uploaded = await uploadTrace(filePath, options.visualizer);
        console.log(`Uploaded ${path.basename(filePath)} as ${uploaded.name || uploaded.upload?.name || 'trace'}`);
      }
    } else {
      finalFiles.forEach((filePath) => console.log(`Imported ${filePath}`));
    }

    if (options.removeContainer) {
      for (const container of createdContainers) {
        runDocker(['rm', container], { ...options, allowFailure: true });
      }
    }

    if (!options.dryRun && finalFiles.length === 0) {
      console.warn('No .sievetrace files found. Try --container-log-dir with the container path that holds logs.');
    }
  } finally {
    if (!options.keepStaging && !options.stagingDir) {
      fs.rmSync(stagingRoot, { recursive: true, force: true });
    } else if (!options.dryRun) {
      console.log(`Staging kept at ${stagingRoot}`);
    }
  }

  return 0;
}

function collectContainerFiles(container, inspectInfo, dirs, pattern, stagingRoot, options) {
  const containerStage = path.join(stagingRoot, safeName(container));
  fs.mkdirSync(containerStage, { recursive: true });
  const regex = globToRegExp(pattern);
  const files = [];
  const isRunning = Boolean(inspectInfo?.State?.Running);

  if (isRunning) {
    for (const dir of dirs) {
      const found = findInRunningContainer(container, dir, pattern, options);
      for (const containerFile of found) {
        const destination = path.join(containerStage, uniqueLocalName(containerStage, path.posix.basename(containerFile)));
        const result = runDocker(['cp', `${container}:${containerFile}`, destination], { ...options, allowFailure: true });
        if (result.status === 0 && regex.test(path.basename(destination))) {
          files.push(destination);
        }
      }
    }
  }

  if (files.length > 0) return files;

  for (const dir of dirs) {
    const copyTarget = path.join(containerStage, safeName(dir));
    const result = runDocker(['cp', `${container}:${dir}`, copyTarget], { ...options, allowFailure: true });
    if (result.status !== 0) continue;
    files.push(...findLocalFiles(copyTarget, regex));
  }

  return files;
}

function findInRunningContainer(container, dir, pattern, options) {
  const result = runDocker(['exec', container, 'find', dir, '-type', 'f', '-name', pattern], {
    ...options,
    allowFailure: true,
  });
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function inspectContainer(container, options) {
  const result = runDocker(['inspect', container], options);
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Container not found: ${container}`);
  }
  return parsed[0];
}

function runDocker(args, options = {}) {
  if (options.verbose) console.error(`docker ${args.join(' ')}`);
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });

  if (options.inherit) {
    result.stdout = '';
    result.stderr = '';
  }

  if (result.error && !options.allowFailure) {
    throw result.error;
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error((result.stderr || `docker ${args.join(' ')} failed`).trim());
  }
  return result;
}

function findLocalFiles(root, regex) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  const stat = fs.statSync(root);
  if (stat.isFile()) {
    if (regex.test(path.basename(root))) out.push(root);
    return out;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...findLocalFiles(entryPath, regex));
    if (entry.isFile() && regex.test(entry.name)) out.push(entryPath);
  }
  return out;
}

function copyToOutputDir(files, outputDir) {
  const resolved = path.resolve(outputDir);
  fs.mkdirSync(resolved, { recursive: true });
  return files.map((filePath) => {
    const destination = path.join(resolved, uniqueLocalName(resolved, path.basename(filePath)));
    fs.copyFileSync(filePath, destination);
    return destination;
  });
}

async function uploadTrace(filePath, visualizer) {
  const url = new URL('/api/logs/upload', visualizer);
  url.searchParams.set('name', path.basename(filePath));
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: fs.readFileSync(filePath),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { error: text };
  }
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `Upload failed with HTTP ${response.status}`);
  }
  return payload;
}

function parseEnv(values) {
  const env = {};
  for (const value of values) {
    const index = value.indexOf('=');
    if (index > 0) env[value.slice(0, index)] = value.slice(index + 1);
  }
  return env;
}

function normalizeContainerPath(value) {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.startsWith('/') ? path.posix.normalize(text) : path.posix.normalize(`/${text}`);
}

function uniqueLocalName(dir, fileName) {
  const parsed = path.parse(fileName);
  let candidate = fileName;
  let index = 1;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
  }
  return candidate;
}

function safeName(value) {
  return String(value || 'container').replace(/[^A-Za-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '') || 'container';
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`);
  return value;
}

function printHelp() {
  console.log(`Usage:
  npm run docker:import -- --container NAME [options]
  npm run docker:import -- --image IMAGE [options] -- [container args]

Options:
  --container NAME          Container name or id to inspect/copy from (repeatable)
  --image IMAGE             Create/start a container from IMAGE, then import traces
  --name NAME               Name for a container created with --image
  --container-log-dir DIR   Container directory to search first (repeatable)
  --pattern GLOB            File pattern to import (default: *.sievetrace)
  --visualizer URL          Visualizer API base URL (default: http://localhost:5173)
  --output-dir DIR          Also copy imported files to this local directory
  --no-upload               Copy files only; do not POST to the visualizer
  --staging-dir DIR         Use an explicit staging directory
  --keep-staging            Keep temporary staging files
  --remove-container        Remove containers created by --image after import
  --dry-run                 Show searched directories without copying
  --verbose                 Print docker commands
`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}