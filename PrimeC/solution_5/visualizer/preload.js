const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onTraceLoaded:    (cb) => ipcRenderer.on('trace-loaded',    (_e, buf, path) => cb(buf, path)),
    onExportPng:      (cb) => ipcRenderer.on('export-png',      () => cb()),
    onExportSequence: (cb) => ipcRenderer.on('export-sequence', (_e, dir) => cb(dir)),
    onExportGif:      (cb) => ipcRenderer.on('export-gif',      (_e, path) => cb(path)),
    onZoomIn:         (cb) => ipcRenderer.on('zoom-in',         () => cb()),
    onZoomOut:        (cb) => ipcRenderer.on('zoom-out',        () => cb()),
    onZoomReset:      (cb) => ipcRenderer.on('zoom-reset',      () => cb()),
    onStepPrev:       (cb) => ipcRenderer.on('step-prev',       () => cb()),
    onStepNext:       (cb) => ipcRenderer.on('step-next',       () => cb()),
    onStepFirst:      (cb) => ipcRenderer.on('step-first',      () => cb()),
    onStepLast:       (cb) => ipcRenderer.on('step-last',       () => cb()),
    saveFile:         (name) => ipcRenderer.invoke('save-file', name),
    writeFile:        (path, b64) => ipcRenderer.invoke('write-file', path, b64),
});
