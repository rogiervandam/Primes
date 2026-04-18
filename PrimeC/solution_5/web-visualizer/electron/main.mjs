/**
 * Electron main process.
 *
 * Serves the Vite-built web-visualizer from dist/ and provides
 * the same /api/logs endpoints so the React app works unchanged.
 */
import { app, BrowserWindow, dialog, Menu, shell, nativeImage } from 'electron';
import { createServer } from 'http';
import {
  readFileSync, readdirSync, existsSync, statSync, createReadStream,
} from 'fs';
import { join, dirname, basename, resolve, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const defaultLogDir = resolve(__dirname, '..', '..', 'log');

/* ------------------------------------------------------------------ */
/*  Local HTTP server (serves dist/ + log API)                        */
/* ------------------------------------------------------------------ */

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let logDir = defaultLogDir;

function createLocalServer() {
  const server = createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    // ---------- Log API ----------
    if (url === '/api/logs') {
      try {
        const files = readdirSync(logDir)
          .filter(f => f.endsWith('.sievetrace'))
          .map(f => ({ name: f, mtime: statSync(join(logDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime)
          .map(f => f.name);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('[]');
      }
      return;
    }

    const prefix = '/api/logs/';
    if (url.startsWith(prefix)) {
      const fileName = decodeURIComponent(url.slice(prefix.length));
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        res.writeHead(400);
        res.end('Invalid file name');
        return;
      }
      const filePath = join(logDir, fileName);
      if (!existsSync(filePath)) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      createReadStream(filePath).pipe(res);
      return;
    }

    // ---------- Static files from dist/ ----------
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

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Window creation                                                    */
/* ------------------------------------------------------------------ */

let mainWindow;
let localServer;
let serverPort;

const isMac = process.platform === 'darwin';

function createWindow(fileParam) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Sieve Visualizer',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let url = `http://127.0.0.1:${serverPort}/`;
  if (fileParam) {
    url += `?file=${encodeURIComponent(fileParam)}`;
  }

  mainWindow.loadURL(url);

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

/* ------------------------------------------------------------------ */
/*  Native menu                                                        */
/* ------------------------------------------------------------------ */

function buildMenu() {
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Trace…',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenTrace(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow?.webContents.send('zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow?.webContents.send('zoom-out'),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow?.webContents.send('zoom-reset'),
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Previous Step',
          accelerator: 'Left',
          click: () => mainWindow?.webContents.executeJavaScript(
            'document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowLeft"}))'
          ),
        },
        {
          label: 'Next Step',
          accelerator: 'Right',
          click: () => mainWindow?.webContents.executeJavaScript(
            'document.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight"}))'
          ),
        },
        {
          label: 'First Step',
          accelerator: 'Home',
          click: () => mainWindow?.webContents.executeJavaScript(
            'document.dispatchEvent(new KeyboardEvent("keydown",{key:"Home"}))'
          ),
        },
        {
          label: 'Last Step',
          accelerator: 'End',
          click: () => mainWindow?.webContents.executeJavaScript(
            'document.dispatchEvent(new KeyboardEvent("keydown",{key:"End"}))'
          ),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
        ] : [
          { role: 'close' },
        ]),
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------ */
/*  File open dialog                                                   */
/* ------------------------------------------------------------------ */

async function handleOpenTrace() {
  if (!mainWindow) return;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Sieve Trace File',
    defaultPath: existsSync(logDir) ? logDir : undefined,
    filters: [
      { name: 'Sieve Trace', extensions: ['sievetrace'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    // Update logDir to the directory of the opened file
    logDir = dirname(filePath);
    const name = basename(filePath);
    mainWindow.loadURL(
      `http://127.0.0.1:${serverPort}/?file=${encodeURIComponent(name)}`
    );
  }
}

/* ------------------------------------------------------------------ */
/*  App lifecycle                                                      */
/* ------------------------------------------------------------------ */

function findMostRecentTrace(dir) {
  if (!existsSync(dir)) return null;
  try {
    const files = readdirSync(dir)
      .filter(f => f.endsWith('.sievetrace'))
      .map(f => ({ name: f, mtime: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0].name : null;
  } catch {
    return null;
  }
}

app.whenReady().then(async () => {
  // Verify dist/ exists
  if (!existsSync(join(distDir, 'index.html'))) {
    dialog.showErrorBox(
      'Build Required',
      'The web visualizer has not been built yet.\n\n' +
      'Run:  cd web-visualizer && npm run build\n\n' +
      'Then try again.'
    );
    app.quit();
    return;
  }

  localServer = await createLocalServer();
  serverPort = localServer.address().port;

  // Determine which trace file to open
  let fileParam = null;
  const cliTrace = process.argv.find(a => a.endsWith('.sievetrace'));
  if (cliTrace && existsSync(cliTrace)) {
    logDir = dirname(resolve(cliTrace));
    fileParam = basename(cliTrace);
  } else {
    fileParam = findMostRecentTrace(logDir);
  }

  buildMenu();
  createWindow(fileParam);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(fileParam);
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) app.quit();
});

app.on('will-quit', () => {
  if (localServer) localServer.close();
});
