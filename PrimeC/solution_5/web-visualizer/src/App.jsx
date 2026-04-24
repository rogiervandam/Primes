import React, { useState, useRef, useCallback, useEffect } from 'react';
import { parseTrace } from './traceParser';
import Visualizer from './Visualizer';

export default function App() {
  const [trace, setTrace] = useState(null);
  const [fileName, setFileName] = useState('');
  const [benchmarkTimingData, setBenchmarkTimingData] = useState(null);
  const [benchmarkTimingFileName, setBenchmarkTimingFileName] = useState('');
  const [error, setError] = useState('');
  const [logFiles, setLogFiles] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [autoRender, setAutoRender] = useState(false);
  const fileInputRef = useRef(null);
  const benchmarkInputRef = useRef(null);
  const dropRef = useRef(null);

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

  const loadFile = useCallback((file) => {
    setError('');
    setBenchmarkTimingData(null);
    setBenchmarkTimingFileName('');
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
      await tryLoadBenchmarkTimingFromApi(name);
      if (autoRenderFlag) setAutoRender(true);
    } catch (err) {
      setError(err.message);
      setTrace(null);
      setBenchmarkTimingData(null);
      setBenchmarkTimingFileName('');
    }
    setLoadingLog(false);
  }, [tryLoadBenchmarkTimingFromApi]);

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
    <>
      <input
        ref={benchmarkInputRef}
        type="file"
        accept=".json,.txt"
        onChange={handleBenchmarkFileInput}
        hidden
      />
      <Visualizer
        trace={trace}
        fileName={fileName}
        benchmarkTimingData={benchmarkTimingData}
        benchmarkTimingFileName={benchmarkTimingFileName}
        onImportBenchmarkTiming={() => benchmarkInputRef.current?.click()}
        onClose={() => {
          setTrace(null);
          setFileName('');
          setAutoRender(false);
          setBenchmarkTimingData(null);
          setBenchmarkTimingFileName('');
        }}
        autoRender={autoRender}
      />
    </>
  );
}
