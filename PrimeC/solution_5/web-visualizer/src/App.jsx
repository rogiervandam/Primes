import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useTraceParser } from './workers/useTraceParser';

// Lazy-load the Visualizer (+ SieveRenderer and all renderer deps) so the
// welcome screen ships without them.  The chunk starts downloading as soon as
// the user opens a file (see preloadVisualizer below).
const Visualizer = React.lazy(() => import('./Visualizer'));

/** Fire-and-forget: start fetching the Visualizer chunk early. */
function preloadVisualizer() { import('./Visualizer'); }

export default function App() {
  // Streaming parse state (replaces the old atomic `trace` + `rawSource`).
  const {
    header,
    steps,
    progress: loadProgress,
    isComplete: loadComplete,
    parseError: parserError,
    startParse,
    abort: abortParse,
    reset: resetParse,
  } = useTraceParser();

  const [fileName, setFileName] = useState('');
  // Describes how to re-fetch the source for the raw-log viewer.
  // { type: 'file', file: File } | { type: 'api', name: string } | null
  const [sourceRef, setSourceRef] = useState(null);
  const [benchmarkTimingData, setBenchmarkTimingData] = useState(null);
  const [benchmarkTimingFileName, setBenchmarkTimingFileName] = useState('');
  const [error, setError] = useState('');
  const [logFiles, setLogFiles] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [autoRender, setAutoRender] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null);
  const fileInputRef = useRef(null);
  const benchmarkInputRef = useRef(null);
  const dropRef = useRef(null);

  const refreshLogFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/logs');
      setLogFiles(res.ok ? await res.json() : []);
    } catch {
      setLogFiles([]);
    }
  }, []);

  const deriveBenchmarkTimingFileName = useCallback((traceName) => {
    if (!traceName) return '';
    const suffix = '.sievetrace';
    if (traceName.endsWith(suffix)) {
      return `${traceName.slice(0, -suffix.length)}_sievebenchmark.json`;
    }
    return `${traceName}_sievebenchmark.json`;
  }, []);

  const parseBenchmarkTimingFile = useCallback((text) => {
    const parsed = JSON.parse(text);
    const benchmark = parsed?.benchmark || {};
    const timings = Array.isArray(parsed?.timings) ? parsed.timings : [];
    return {
      benchmark: {
        passes: Number(benchmark.passes) || 0,
        elapsed_time: Number(benchmark.elapsed_time) || 0,
        avg: Number(benchmark.avg) || 0,
        settings: benchmark.settings || '',
      },
      timings: timings
        .map((t) => ({
          function: String(t.function || ''),
          hits: Number(t.hits) || 0,
          total_time_s: Number(t.total_time_s) || 0,
          avg_time_per_pass_s: Number(t.avg_time_per_pass_s) || 0,
          avg_time_per_call_s: Number(t.avg_time_per_call_s) || 0,
        }))
        .filter((t) => t.function),
    };
  }, []);

  const tryLoadBenchmarkTimingFromApi = useCallback(async (traceName) => {
    const benchmarkName = deriveBenchmarkTimingFileName(traceName);
    if (!benchmarkName) {
      setBenchmarkTimingData(null);
      setBenchmarkTimingFileName('');
      return;
    }
    try {
      // Companion benchmark files are optional; avoid noisy 404 requests by
      // checking the available log list before trying to fetch the file.
      const listRes = await fetch('/api/logs');
      if (!listRes.ok) {
        setBenchmarkTimingData(null);
        setBenchmarkTimingFileName('');
        return;
      }
      const available = await listRes.json();
      if (!Array.isArray(available) || !available.includes(benchmarkName)) {
        setBenchmarkTimingData(null);
        setBenchmarkTimingFileName('');
        return;
      }

      const res = await fetch(`/api/logs/${encodeURIComponent(benchmarkName)}`);
      if (!res.ok) {
        setBenchmarkTimingData(null);
        setBenchmarkTimingFileName('');
        return;
      }
      const text = await res.text();
      const parsed = parseBenchmarkTimingFile(text);
      setBenchmarkTimingData(parsed);
      setBenchmarkTimingFileName(benchmarkName);
    } catch {
      setBenchmarkTimingData(null);
      setBenchmarkTimingFileName('');
    }
  }, [deriveBenchmarkTimingFileName, parseBenchmarkTimingFile]);

  const loadFile = useCallback(async (file) => {
    setError('');
    setBenchmarkTimingData(null);
    setBenchmarkTimingFileName('');
    preloadVisualizer();
    setSourceRef({ type: 'file', file });
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      startParse(e.target.result);
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, [startParse]);

  const loadFromApi = useCallback(async (name, autoRenderFlag = false) => {
    setError('');
    setLoadingLog(true);
    preloadVisualizer();
    try {
      const res = await fetch(`/api/logs/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`Failed to load ${name}: ${res.statusText}`);
      const text = await res.text();
      setSourceRef({ type: 'api', name });
      setFileName(name);
      startParse(text);
      await tryLoadBenchmarkTimingFromApi(name);
      if (autoRenderFlag) setAutoRender(true);
    } catch (err) {
      setError(err.message);
      setBenchmarkTimingData(null);
      setBenchmarkTimingFileName('');
    }
    setLoadingLog(false);
  }, [startParse, tryLoadBenchmarkTimingFromApi]);

  const importBenchmarkTimingFile = useCallback((file) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseBenchmarkTimingFile(e.target.result);
        setBenchmarkTimingData(parsed);
        setBenchmarkTimingFileName(file.name);
      } catch (err) {
        setError(`Invalid benchmark timing file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }, [parseBenchmarkTimingFile]);

  // Fetch available log files and check URL params on mount
  useEffect(() => {
    refreshLogFiles();

    const params = new URLSearchParams(window.location.search);
    const fileParam = params.get('file');
    const autoParam = params.get('autorender');
    if (fileParam) {
      loadFromApi(fileParam, autoParam === 'true');
    }
  }, [loadFromApi, refreshLogFiles]);

  useEffect(() => {
    let cancelled = false;
    const checkPendingUpload = async () => {
      if (cancelled || pendingUpload) return;
      try {
        const res = await fetch('/api/logs/pending-upload');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.upload) setPendingUpload(data.upload);
      } catch {
        // The static nginx build has no log API; silently keep the app usable.
      }
    };

    checkPendingUpload();
    const timer = window.setInterval(checkPendingUpload, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pendingUpload]);

  const acknowledgePendingUpload = useCallback(async (upload) => {
    if (!upload?.id) return;
    try {
      await fetch(`/api/logs/pending-upload/${encodeURIComponent(upload.id)}/ack`, { method: 'POST' });
    } catch {
      // If the ack fails, the next poll will offer the trace again.
    }
  }, []);

  const openPendingUpload = useCallback(async () => {
    const upload = pendingUpload;
    if (!upload) return;
    setPendingUpload(null);
    await acknowledgePendingUpload(upload);
    await refreshLogFiles();
    await loadFromApi(upload.name);
  }, [acknowledgePendingUpload, loadFromApi, pendingUpload, refreshLogFiles]);

  const keepCurrentTrace = useCallback(async () => {
    const upload = pendingUpload;
    if (!upload) return;
    setPendingUpload(null);
    await acknowledgePendingUpload(upload);
    await refreshLogFiles();
  }, [acknowledgePendingUpload, pendingUpload, refreshLogFiles]);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleBenchmarkFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) importBenchmarkTimingFile(file);
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

  const pendingUploadPrompt = pendingUpload && (
    <div className="upload-prompt-backdrop" role="presentation">
      <div className="upload-prompt" role="dialog" aria-modal="true" aria-labelledby="upload-prompt-title">
        <div id="upload-prompt-title" className="upload-prompt-title">Open uploaded trace?</div>
        <div className="upload-prompt-file">{pendingUpload.name}</div>
        <div className="upload-prompt-actions">
          <button type="button" className="upload-prompt-secondary" onClick={keepCurrentTrace}>Keep current</button>
          <button type="button" className="upload-prompt-primary" onClick={openPendingUpload}>Open</button>
        </div>
      </div>
    </div>
  );

  if (!header) {
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
              accept=".sievetrace,.json,.log,.txt"
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
          {(error || parserError) && <div className="error-msg">{error || parserError}</div>}
          <div className="instructions">
            <h3>How to generate a trace</h3>
            <pre>./sieve trace extend 100</pre>
            <p>This creates a <code>.sievetrace</code> file in the <code>log/</code> directory.</p>
            <h3>Quick visualize</h3>
            <pre>./sieve visualize extend</pre>
            <p>Compiles with trace, runs, and opens this visualizer automatically.</p>
          </div>
        </div>
        {pendingUploadPrompt}
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="loading-msg">Loading visualizer…</div>}>
      <input
        ref={benchmarkInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleBenchmarkFileInput}
        hidden
      />
      <Visualizer
        header={header}
        steps={steps}
        loadComplete={loadComplete}
        loadProgress={loadProgress}
        sourceRef={sourceRef}
        fileName={fileName}
        benchmarkTimingData={benchmarkTimingData}
        benchmarkTimingFileName={benchmarkTimingFileName}
        onImportBenchmarkTiming={() => benchmarkInputRef.current?.click()}
        onClose={() => {
          resetParse();
          setSourceRef(null);
          setFileName('');
          setAutoRender(false);
          setBenchmarkTimingData(null);
          setBenchmarkTimingFileName('');
        }}
        autoRender={autoRender}
      />
      {pendingUploadPrompt}
    </Suspense>
  );
}
