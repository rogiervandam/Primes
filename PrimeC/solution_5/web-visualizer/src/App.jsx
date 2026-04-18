import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseTrace } from './traceParser';
import Visualizer from './Visualizer';

export default function App() {
  const [trace, setTrace] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [logFiles, setLogFiles] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [autoRender, setAutoRender] = useState(false);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const loadFile = useCallback((file) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseTrace(e.target.result);
        setTrace(parsed);
        setFileName(file.name);
      } catch (err) {
        setError(err.message);
        setTrace(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const loadFromApi = useCallback(async (name, autoRenderFlag = false) => {
    setError('');
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Failed to load ${name}: ${res.statusText}`);
      const text = await res.text();
      const parsed = parseTrace(text);
      setTrace(parsed);
      setFileName(name);
      if (autoRenderFlag) setAutoRender(true);
    } catch (err) {
      setError(err.message);
      setTrace(null);
    }
    setLoadingLog(false);
  }, []);

  // Fetch available log files and check URL params on mount
  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.ok ? r.json() : [])
      .then(setLogFiles)
      .catch(() => setLogFiles([]));

    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get('file');
    const autoParam = params.get('autorender');
    if (fileParam) {
      loadFromApi(fileParam, autoParam === 'true');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.remove('drag-over');
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropRef.current?.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropRef.current?.classList.remove('drag-over');
  };

  if (!trace) {
    return (
      <div
        className="welcome"
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="welcome-content">
          <h1>Sieve Visualizer</h1>
          <p>Visualize the bitstorage changes in a Sieve of Eratosthenes trace.</p>
          <div className="upload-area">
            <p>Drag &amp; drop a <code>.sievetrace</code> file here</p>
            <p className="or">or</p>
            <button onClick={() => fileInputRef.current?.click()}>
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sievetrace,.json"
              onChange={handleFileInput}
              hidden
            />
          </div>
          {logFiles.length > 0 && (
            <div className="log-picker">
              <h3>Recent Traces</h3>
              <ul className="log-file-list">
                {logFiles.map((f) => (
                  <li key={f}>
                    <button
                      className="log-file-btn"
                      onClick={() => loadFromApi(f)}
                      disabled={loadingLog}
                    >
                      {f}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingLog && <div className="loading-msg">Loading trace file…</div>}
          {error && <div className="error-msg">{error}</div>}
          <div className="instructions">
            <h3>How to generate a trace</h3>
            <pre>./sieve trace extend 100</pre>
            <p>This creates a <code>.sievetrace</code> file in the <code>log/</code> directory.</p>
            <h3>Quick visualize</h3>
            <pre>./sieve visualize extend</pre>
            <p>Compiles with trace, runs, and opens this visualizer automatically.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Visualizer
      trace={trace}
      fileName={fileName}
      onClose={() => { setTrace(null); setFileName(''); setAutoRender(false); }}
      autoRender={autoRender}
    />
  );
}
