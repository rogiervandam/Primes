import React, { useEffect, useState } from 'react';

const EMPTY_SNAPSHOT = {
  fps: 0,
  avgMs: 0,
  latestMs: 0,
  maxMs: 0,
  sampleCount: 0,
  budgetMs: 16.67,
  frameTimes: [],
};

function readSnapshot(rendererRef) {
  const renderer = rendererRef.current;
  if (!renderer || typeof renderer.getPerformanceSnapshot !== 'function') {
    return EMPTY_SNAPSHOT;
  }
  return renderer.getPerformanceSnapshot();
}

function barClass(frameMs, budgetMs) {
  if (frameMs > budgetMs * 1.5) return 'debug-tools-bar high';
  if (frameMs > budgetMs) return 'debug-tools-bar warn';
  return 'debug-tools-bar ok';
}

export default function DebugToolsPanel({ rendererRef, rightOffset = 8 }) {
  const [snapshot, setSnapshot] = useState(() => readSnapshot(rendererRef));

  useEffect(() => {
    setSnapshot(readSnapshot(rendererRef));
    const id = window.setInterval(() => {
      setSnapshot(readSnapshot(rendererRef));
    }, 250);
    return () => window.clearInterval(id);
  }, [rendererRef]);

  const frameTimes = snapshot.frameTimes || [];
  const budgetMs = snapshot.budgetMs || 16.67;
  const scaleMs = Math.max(snapshot.maxMs || 0, budgetMs * 1.5, 1);
  const bars = Array.from({ length: 60 }, (_, index) => (
    frameTimes[frameTimes.length - 60 + index] || 0
  ));

  return (
    <aside
      className="debug-tools-panel"
      style={{ '--debug-tools-right': `${Math.max(8, rightOffset)}px` }}
      aria-label="Debug tools"
    >
      <div className="debug-tools-header">
        <span>Debug tools</span>
        <span>Renderer</span>
      </div>
      <div className="debug-tools-metrics">
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.fps : '...'}</strong>
          <span>fps</span>
        </div>
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.avgMs.toFixed(1) : '...'}</strong>
          <span>avg ms</span>
        </div>
        <div className="debug-tools-metric">
          <strong>{snapshot.sampleCount > 0 ? snapshot.latestMs.toFixed(1) : '...'}</strong>
          <span>last ms</span>
        </div>
      </div>
      <div className="debug-tools-chart" aria-hidden="true">
        <div
          className="debug-tools-budget-line"
          style={{ bottom: `${Math.min(100, (budgetMs / scaleMs) * 100)}%` }}
        />
        {bars.map((frameMs, index) => (
          <span
            key={index}
            className={barClass(frameMs, budgetMs)}
            style={{ height: `${Math.max(2, Math.min(100, (frameMs / scaleMs) * 100))}%` }}
          />
        ))}
      </div>
      <div className="debug-tools-footer">
        <span>{snapshot.sampleCount}/60 samples</span>
        <span>16.7 ms budget</span>
      </div>
    </aside>
  );
}
