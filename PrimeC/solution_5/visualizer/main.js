const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs   = require('fs');

app.disableHardwareAcceleration();

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        title: 'Sieve Visualizer',
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Trace...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => handleOpenTrace(),
                },
                {
                    label: 'Export Current View as PNG...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => mainWindow.webContents.send('export-png'),
                },
                {
                    label: 'Export All Steps as PNG Sequence...',
                    accelerator: 'CmdOrCtrl+Shift+E',
                    click: () => handleExportSequence(),
                },
                {
                    label: 'Export as GIF...',
                    accelerator: 'CmdOrCtrl+G',
                    click: () => handleExportGif(),
                },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+=',
                    click: () => mainWindow.webContents.send('zoom-in'),
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => mainWindow.webContents.send('zoom-out'),
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => mainWindow.webContents.send('zoom-reset'),
                },
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
                    click: () => mainWindow.webContents.send('step-prev'),
                },
                {
                    label: 'Next Step',
                    accelerator: 'Right',
                    click: () => mainWindow.webContents.send('step-next'),
                },
                {
                    label: 'First Step',
                    accelerator: 'Home',
                    click: () => mainWindow.webContents.send('step-first'),
                },
                {
                    label: 'Last Step',
                    accelerator: 'End',
                    click: () => mainWindow.webContents.send('step-last'),
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

async function handleOpenTrace() {
    const logDir = path.join(__dirname, '..', 'log');
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Open Sieve Trace File',
        defaultPath: fs.existsSync(logDir) ? logDir : undefined,
        filters: [
            { name: 'Sieve Trace', extensions: ['sievetrace'] },
            { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const buffer = fs.readFileSync(filePath);
        mainWindow.webContents.send('trace-loaded', buffer, filePath);
    }
}

async function handleExportSequence() {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Output Folder for PNG Sequence',
        properties: ['openDirectory', 'createDirectory'],
    });
    if (!result.canceled && result.filePaths.length > 0) {
        mainWindow.webContents.send('export-sequence', result.filePaths[0]);
    }
}

async function handleExportGif() {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export as GIF',
        filters: [{ name: 'GIF', extensions: ['gif'] }],
    });
    if (!result.canceled && result.filePath) {
        mainWindow.webContents.send('export-gif', result.filePath);
    }
}

// Handle save-file requests from renderer
ipcMain.handle('save-file', async (_event, defaultName) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Save PNG',
        defaultPath: defaultName,
        filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    return result.canceled ? null : result.filePath;
});

ipcMain.handle('write-file', async (_event, filePath, dataBase64) => {
    const buf = Buffer.from(dataBase64, 'base64');
    fs.writeFileSync(filePath, buf);
    return true;
});

/**
 * Find the most recent .sievetrace file in a directory.
 * Returns the full path, or null if none found.
 */
function findMostRecentTrace(dir) {
    if (!fs.existsSync(dir)) return null;
    const files = fs.readdirSync(dir)
        .filter((f) => f.endsWith('.sievetrace'))
        .map((f) => ({
            name: f,
            full: path.join(dir, f),
            mtime: fs.statSync(path.join(dir, f)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);
    return files.length > 0 ? files[0].full : null;
}

// Accept file path via command line argument, or auto-open most recent from ../log/
app.whenReady().then(() => {
    createWindow();

    let traceFile = process.argv.find((a) => a.endsWith('.sievetrace'));
    if (traceFile && !fs.existsSync(traceFile)) traceFile = null;

    // Fallback: find most recent trace in ../log/ (relative to visualizer dir)
    if (!traceFile) {
        const logDir = path.join(__dirname, '..', 'log');
        traceFile = findMostRecentTrace(logDir);
    }

    if (traceFile) {
        const buffer = fs.readFileSync(traceFile);
        mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('trace-loaded', buffer, traceFile);
        });
    }
});

app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
