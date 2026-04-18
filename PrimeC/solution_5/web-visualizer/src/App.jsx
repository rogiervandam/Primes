import React, { useState, useRef, useCallback } from 'react';
import { parseTrace } from './traceParser';
import Visualizer from './Visualizer';

export default function App() {
  const [trace, setTrace] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
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
          {error && <div className="error-msg">{error}</div>}
          <div className="instructions">
            <h3>How to generate a trace</h3>
            <pre>./sieve trace extend 100</pre>
            <p>This creates a <code>.sievetrace</code> file in the <code>log/</code> directory.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Visualizer
      trace={trace}
      fileName={fileName}
      onClose={() => { setTrace(null); setFileName(''); }}
    />
  );
}
