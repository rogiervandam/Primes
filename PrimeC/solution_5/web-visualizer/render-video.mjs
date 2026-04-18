#!/usr/bin/env node
/**
 * CLI video renderer for sieve trace files.
 *
 * Usage:
 *   node render-video.mjs [trace-file] [--output file.webm] [--width 1920] [--height 1080]
 *
 * Defaults:
 *   - trace-file: latest .sievetrace in ../log/
 *   - output: same path as trace file with .webm extension
 *   - resolution: 1920x1080
 *
 * Requires: puppeteer (npm install puppeteer)
 */
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');
const defaultLogDir = resolve(__dirname, '../log');

// ---- Parse CLI args ----
let traceFile = null;
let outputFile = null;
let width = 1920;
let height = 1080;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--output': case '-o':
      outputFile = args[++i];
      break;
    case '--width': case '-w':
      width = parseInt(args[++i]) || 1920;
      break;
    case '--height': case '-h':
      height = parseInt(args[++i]) || 1080;
      break;
    case '--help':
      console.log('Usage: node render-video.mjs [trace-file] [options]');
      console.log('');
      console.log('Options:');
      console.log('  --output, -o <file>   Output video file (default: <trace>.webm)');
      console.log('  --width, -w <px>      Video width (default: 1920)');
      console.log('  --height, -h <px>     Video height (default: 1080)');
      console.log('  --help                Show this help');
      process.exit(0);
      break;
    default:
      if (!traceFile && !args[i].startsWith('-')) {
        traceFile = args[i];
      }
      break;
  }
}

// Default to latest trace file
if (!traceFile) {
  try {
    const files = readdirSync(defaultLogDir)
      .filter(f => f.endsWith('.sievetrace'))
      .map(f => ({ name: f, mtime: statSync(join(defaultLogDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length > 0) {
      traceFile = join(defaultLogDir, files[0].name);
    }
  } catch { /* ignore */ }
}

if (!traceFile) {
  console.error('No trace file specified and none found in log/ directory.');
  console.error('Usage: node render-video.mjs [trace-file] [--output file.webm]');
  process.exit(1);
}

traceFile = resolve(traceFile);
if (!outputFile) {
  outputFile = traceFile.replace(/\.sievetrace$/, '.webm');
}

if (!existsSync(traceFile)) {
  console.error(`Trace file not found: ${traceFile}`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error('Web visualizer not built. Run: cd web-visualizer && npm run build');
  process.exit(1);
}

// ---- Load puppeteer ----
let puppeteer;
try {
  puppeteer = await import('puppeteer');
} catch {
  console.error('puppeteer is required for CLI video rendering.');
  console.error('Install it with: cd web-visualizer && npm install puppeteer');
  process.exit(1);
}

const traceContent = readFileSync(traceFile, 'utf-8');
const traceBaseName = basename(traceFile);

console.log(`Trace:  ${traceBaseName}`);
console.log(`Output: ${basename(outputFile)}`);
console.log(`Size:   ${width}x${height}`);

// ---- Start HTTP server ----
const mimeTypes = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];

  // API: list logs
  if (url === '/api/logs') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([traceBaseName]));
    return;
  }

  // API: serve trace file
  if (url.startsWith('/api/logs/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(traceContent);
    return;
  }

  // Serve static files from dist/
  let filePath = url === '/' ? '/index.html' : url;
  filePath = join(distDir, filePath);

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(distDir, 'index.html'); // SPA fallback
  }

  const ext = extname(filePath);
  const mime = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(readFileSync(filePath));
});

const PORT = 4174;

server.listen(PORT, async () => {
  console.log(`Server started on port ${PORT}`);

  let browser;
  try {
    browser = await puppeteer.default.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Forward console output
    page.on('console', msg => {
      const text = msg.text();
      if (text) process.stdout.write(`  [page] ${text}\n`);
    });

    const url = `http://localhost:${PORT}?file=${encodeURIComponent(traceBaseName)}&autorender=true`;
    console.log('Loading trace file...');
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('Rendering video (this may take a while)...');
    await page.waitForFunction('window.__renderComplete === true', {
      timeout: 600000, // 10 minutes max
      polling: 1000,
    });

    console.log('Extracting video data...');
    const videoBase64 = await page.evaluate(async () => {
      const blob = window.__exportedVideo;
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    });

    const videoBuffer = Buffer.from(videoBase64, 'base64');
    writeFileSync(outputFile, videoBuffer);
    const sizeMB = (videoBuffer.length / 1024 / 1024).toFixed(1);
    console.log(`Video saved: ${outputFile} (${sizeMB} MB)`);
  } catch (err) {
    console.error('Render failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
});
