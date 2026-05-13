import React, { useEffect, useMemo, useState } from 'react';
import { useFloatingPanel } from '../hooks/ui_state';

/**
 * Format nanoseconds to a compact human-readable string.
 * < 1µs  → "Xns"   (e.g. 500ns)
 * < 1ms  → "Xµs"   (e.g. 21.4µs)
 * < 1s   → "Xms"   (e.g. 3.2ms)
 * >= 1s  → "Xs"    (e.g. 1.23s)
 */
export function formatNs(ns, decimals = 1) {
  if (!Number.isFinite(ns) || ns <= 0) return '0';
  if (ns < 1000) return `${Math.round(ns)}ns`;
  if (ns < 1_000_000) return `${(ns / 1_000).toFixed(decimals)}µs`;
  if (ns < 1_000_000_000) return `${(ns / 1_000_000).toFixed(decimals)}ms`;
  return `${(ns / 1_000_000_000).toFixed(2)}s`;
}

function aggregateTraceTimings(steps) {
  const byFunction = new Map();
  for (const step of steps) {
    if (step.elapsedNs == null || step.elapsedNs <= 0) continue;
    const key = step.operation || '(unknown)';
    if (!byFunction.has(key)) {
      byFunction.set(key, { totalNs: 0, callCount: 0, minNs: Infinity, maxNs: -Infinity });
    }
    const entry = byFunction.get(key);
    entry.totalNs += step.elapsedNs;
    entry.callCount += 1;
    entry.minNs = Math.min(entry.minNs, step.elapsedNs);
    entry.maxNs = Math.max(entry.maxNs, step.elapsedNs);
  }
  return byFunction;
}

function aggregateBenchmarkTimings(benchmarkTimingData) {
  const byFunction = new Map();
  if (!benchmarkTimingData || !Array.isArray(benchmarkTimingData.timings)) return byFunction;
  for (const item of benchmarkTimingData.timings) {
    const name = String(item.function || '').trim();
    if (!name) continue;
    byFunction.set(name, {
      hits: Number(item.hits) || 0,
      totalNs: (Number(item.total_time_s) || 0) * 1e9,
      avgPerPassNs: (Number(item.avg_time_per_pass_s) || 0) * 1e9,
      avgPerCallNs: (Number(item.avg_time_per_call_s) || 0) * 1e9,
    });
  }
  return byFunction;
}

/**
 * Build per-second and per-5-second time series for each function, in trace order.
 * Uses a synthetic wall clock: accumulated elapsedNs. Buckets keyed by floor(elapsed / bucketSize).
 */
function buildTimeSeries(steps, bucketNs) {
  const byFunction = new Map();
  let cursorNs = 0;
  for (const step of steps) {
    if (step.elapsedNs == null || step.elapsedNs <= 0) continue;
    const key = step.operation || '(unknown)';
    const bucket = Math.floor(cursorNs / bucketNs);
    if (!byFunction.has(key)) byFunction.set(key, new Map());
    const series = byFunction.get(key);
    series.set(bucket, (series.get(bucket) || 0) + step.elapsedNs);
    cursorNs += step.elapsedNs;
  }
  const totalBuckets = Math.max(1, Math.ceil(cursorNs / bucketNs));
  return { byFunction, totalBuckets, totalNs: cursorNs };
}

const DEFAULT_WIDTH = 620;
const DEFAULT_HEIGHT = 520;
const MIN_WIDTH = 420;
const MIN_HEIGHT = 280;

export default function TimingPanel({
  steps,
  benchmarkTimingData,
  benchmarkTimingFileName,
  onClose,
  onFocusFn,
  onImportBenchmarkTiming,
}) {
  const [sortBy, setSortBy] = useState('time');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState('trace'); // 'trace' | 'benchmark' | 'timeseries'
  const [bucketSec, setBucketSec] = useState(1); // 1 or 5 seconds per bucket

  const { panelRef, panelStyle, onHeaderMouseDown, onResizeMouseDown } = useFloatingPanel({
    defaultWidth: DEFAULT_WIDTH,
    defaultHeight: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
  });

  const traceMap = useMemo(() => aggregateTraceTimings(steps), [steps]);
  const benchmarkMap = useMemo(() => aggregateBenchmarkTimings(benchmarkTimingData), [benchmarkTimingData]);
  const timeSeries = useMemo(
    () => buildTimeSeries(steps, bucketSec * 1e9),
    [steps, bucketSec]
  );

  const rows = useMemo(() => {
    const names = new Set([...traceMap.keys(), ...benchmarkMap.keys()]);
    const arr = Array.from(names).map((name) => {
      const t = traceMap.get(name);
      const b = benchmarkMap.get(name);
      return {
        name,
        traceTotalNs: t?.totalNs ?? 0,
        traceCallCount: t?.callCount ?? 0,
        traceAvgNs: t?.callCount > 0 ? t.totalNs / t.callCount : 0,
        benchHits: b?.hits ?? 0,
        benchTotalNs: b?.totalNs ?? 0,
        benchAvgPerPassNs: b?.avgPerPassNs ?? 0,
        benchAvgPerCallNs: b?.avgPerCallNs ?? 0,
      };
    });
    const sortKey = viewMode === 'benchmark' ? 'bench' : (sortBy === 'bench' ? 'time' : sortBy);
    const comp = {
      time: (a, b) => b.traceTotalNs - a.traceTotalNs,
      calls: (a, b) => b.traceCallCount - a.traceCallCount,
      avg: (a, b) => b.traceAvgNs - a.traceAvgNs,
      bench: (a, b) => b.benchTotalNs - a.benchTotalNs,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sortKey] || ((a, b) => b.traceTotalNs - a.traceTotalNs);
    return sortAsc ? [...arr].sort((a, b) => -comp(a, b)) : [...arr].sort(comp);
  }, [traceMap, benchmarkMap, sortBy, sortAsc, viewMode]);

  const traceTotalNs = useMemo(() => rows.reduce((s, r) => s + r.traceTotalNs, 0), [rows]);
  const benchTotalNs = useMemo(() => rows.reduce((s, r) => s + r.benchTotalNs, 0), [rows]);
  const hasTrace = traceTotalNs > 0;
  const hasBenchmark = !!benchmarkTimingData && benchmarkMap.size > 0;
  const hasData = rows.length > 0;

  const handleSortClick = (col) => {
    if (sortBy === col) setSortAsc((a) => !a);
    else { setSortBy(col); setSortAsc(false); }
  };

  const SortIndicator = ({ col }) => {
    if (sortBy !== col) return <span className="timing-sort-indicator inactive">↕</span>;
    return <span className="timing-sort-indicator">{sortAsc ? '↑' : '↓'}</span>;
  };

  return (
    <div className="timing-panel timing-panel-floating" ref={panelRef} style={panelStyle}>
      <div className="timing-panel-header" onMouseDown={onHeaderMouseDown}>
        <span className="timing-panel-title">Function Timings</span>
        <div className="timing-view-toggle" role="tablist">
          <button
            type="button"
            className={`timing-view-btn${viewMode === 'trace' ? ' active' : ''}`}
            onClick={() => setViewMode('trace')}
            title="Show per-trace event timings"
          >
            Trace
          </button>
          <button
            type="button"
            className={`timing-view-btn${viewMode === 'benchmark' ? ' active' : ''}`}
            onClick={() => setViewMode('benchmark')}
            disabled={!hasBenchmark}
            title={hasBenchmark ? 'Show benchmark timings' : 'No benchmark data imported'}
          >
            Benchmark
          </button>
          <button
            type="button"
            className={`timing-view-btn${viewMode === 'timeseries' ? ' active' : ''}`}
            onClick={() => setViewMode('timeseries')}
            title="Show timings over simulated wall-clock time"
          >
            Time
          </button>
        </div>
        <button className="timing-panel-close btn-icon" onClick={onClose} title="Close timing panel">✕</button>
      </div>

      <div className="timing-panel-subheader">
        {hasTrace && <span className="timing-panel-total">Trace: {formatNs(traceTotalNs)}</span>}
        {hasBenchmark && <span className="timing-panel-total">Benchmark: {formatNs(benchTotalNs)}</span>}
        {onImportBenchmarkTiming && (
          <button
            type="button"
            className={`timing-import-btn${hasBenchmark ? ' active' : ''}`}
            onClick={onImportBenchmarkTiming}
            title={hasBenchmark ? `Replace benchmark timing (${benchmarkTimingFileName || 'manual import'})` : 'Import benchmark timing JSON'}
          >
            {hasBenchmark ? 'Replace benchmark…' : 'Import benchmark…'}
          </button>
        )}
        {viewMode === 'timeseries' && (
          <span className="timing-bucket-toggle">
            <span className="timing-bucket-label">Bucket</span>
            <button
              type="button"
              className={`timing-bucket-btn${bucketSec === 1 ? ' active' : ''}`}
              onClick={() => setBucketSec(1)}
              title="1-second buckets"
            >1s</button>
            <button
              type="button"
              className={`timing-bucket-btn${bucketSec === 5 ? ' active' : ''}`}
              onClick={() => setBucketSec(5)}
              title="5-second buckets"
            >5s</button>
          </span>
        )}
      </div>

      {hasBenchmark && viewMode === 'benchmark' && (
        <div className="timing-panel-benchmark-meta">
          <span className="timing-benchmark-source" title={benchmarkTimingFileName || 'manual import'}>
            Source: {benchmarkTimingFileName || 'manual import'}
          </span>
          {benchmarkTimingData?.benchmark && (
            <span className="timing-benchmark-run">
              {benchmarkTimingData.benchmark.passes?.toLocaleString?.() || benchmarkTimingData.benchmark.passes || 0} passes · {(benchmarkTimingData.benchmark.elapsed_time || 0).toFixed(3)}s · {(benchmarkTimingData.benchmark.avg || 0).toFixed(1)}/s
            </span>
          )}
        </div>
      )}

      {!hasData && (
        <div className="timing-panel-empty">
          No timing data available in this trace.<br />
          <small>Timings are captured by <code>logStart</code>/<code>logStop</code> macros.</small>
        </div>
      )}

      {hasData && viewMode !== 'timeseries' && (
        <div className="timing-panel-body">
          <table className="timing-table">
            <thead>
              <tr>
                <th className="timing-th timing-th-name" onClick={() => handleSortClick('name')}>Function <SortIndicator col="name" /></th>
                <th className="timing-th timing-th-calls" onClick={() => handleSortClick('calls')}>Calls <SortIndicator col="calls" /></th>
                <th className="timing-th timing-th-total" onClick={() => handleSortClick('time')}>Trace total <SortIndicator col="time" /></th>
                <th className="timing-th timing-th-avg" onClick={() => handleSortClick('avg')}>Trace avg/call <SortIndicator col="avg" /></th>
                <th className="timing-th timing-th-avg" onClick={() => handleSortClick('bench')}>Bench avg/pass <SortIndicator col="bench" /></th>
                <th className="timing-th timing-th-avg">Bench avg/call</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pctBasis = viewMode === 'benchmark' ? benchTotalNs : traceTotalNs;
                const pctVal = viewMode === 'benchmark' ? row.benchTotalNs : row.traceTotalNs;
                const pct = pctBasis > 0 ? (pctVal / pctBasis) * 100 : 0;
                const isHot = pct >= 20;
                const isWarm = pct >= 5;
                return (
                  <tr
                    key={row.name}
                    className={`timing-tr${isHot ? ' hot' : isWarm ? ' warm' : ''}`}
                    onClick={() => onFocusFn && onFocusFn(row.name)}
                  >
                    <td className="timing-td timing-td-name">
                      <span className={`timing-heat-dot${isHot ? ' hot' : isWarm ? ' warm' : ''}`} />
                      {row.name}
                    </td>
                    <td className="timing-td timing-td-calls">{(row.traceCallCount || row.benchHits).toLocaleString()}</td>
                    <td className="timing-td timing-td-total">{row.traceTotalNs > 0 ? formatNs(row.traceTotalNs) : '—'}</td>
                    <td className="timing-td timing-td-avg">{row.traceAvgNs > 0 ? formatNs(row.traceAvgNs) : '—'}</td>
                    <td className="timing-td timing-td-avg">{row.benchAvgPerPassNs > 0 ? formatNs(row.benchAvgPerPassNs) : '—'}</td>
                    <td className="timing-td timing-td-avg">{row.benchAvgPerCallNs > 0 ? formatNs(row.benchAvgPerCallNs) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasData && viewMode === 'timeseries' && (
        <div className="timing-panel-body timing-series-body">
          <div className="timing-series-help">
            Per-{bucketSec}s time spent in each function (synthetic wall-clock built from event durations).
          </div>
          <div className="timing-series-list">
            {rows.map((row) => {
              const series = timeSeries.byFunction.get(row.name);
              if (!series) return null;
              const maxNs = Array.from(series.values()).reduce((m, v) => Math.max(m, v), 0);
              const totalBuckets = timeSeries.totalBuckets;
              return (
                <div
                  key={row.name}
                  className="timing-series-row"
                  onClick={() => onFocusFn && onFocusFn(row.name)}
                  title={`${row.name}: total ${formatNs(row.traceTotalNs)} · max/${bucketSec}s ${formatNs(maxNs)}`}
                >
                  <span className="timing-series-label">{row.name}</span>
                  <div className="timing-series-track">
                    {Array.from({ length: totalBuckets }).map((_, i) => {
                      const v = series.get(i) || 0;
                      const h = maxNs > 0 ? (v / maxNs) * 100 : 0;
                      return <span key={i} className="timing-series-cell" style={{ height: `${h.toFixed(1)}%` }} title={`bucket ${i}: ${formatNs(v)}`} />;
                    })}
                  </div>
                  <span className="timing-series-value">{formatNs(row.traceTotalNs)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="timing-panel-resize-handle" onMouseDown={onResizeMouseDown} title="Resize" />
    </div>
  );
}
