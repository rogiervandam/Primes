import React, { useMemo, useState } from 'react';

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

/**
 * Aggregate timing data from parsed trace events.
 * Uses only steps with elapsedNs > 0 (typically logEnds events).
 */
function aggregateTraceTimings(steps) {
  const byFunction = new Map(); // function → { totalNs, callCount, minNs, maxNs }

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

/**
 * Normalize benchmark timing json to function map.
 */
function aggregateBenchmarkTimings(benchmarkTimingData) {
  const byFunction = new Map(); // function → { hits, totalNs, avgPerPassNs, avgPerCallNs }
  if (!benchmarkTimingData || !Array.isArray(benchmarkTimingData.timings)) return byFunction;

  for (const item of benchmarkTimingData.timings) {
    const name = String(item.function || '').trim();
    if (!name) continue;

    const totalNs = (Number(item.total_time_s) || 0) * 1e9;
    const avgPerPassNs = (Number(item.avg_time_per_pass_s) || 0) * 1e9;
    const avgPerCallNs = (Number(item.avg_time_per_call_s) || 0) * 1e9;
    const hits = Number(item.hits) || 0;

    byFunction.set(name, {
      hits,
      totalNs,
      avgPerPassNs,
      avgPerCallNs,
    });
  }

  return byFunction;
}

/**
 * TimingPanel — compares trace-event timings with benchmark-average timings.
 */
export default function TimingPanel({ steps, benchmarkTimingData, benchmarkTimingFileName, onClose, onFocusFn }) {
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'calls' | 'avg' | 'name' | 'bench'
  const [sortAsc, setSortAsc] = useState(false);

  const traceMap = useMemo(() => aggregateTraceTimings(steps), [steps]);
  const benchmarkMap = useMemo(() => aggregateBenchmarkTimings(benchmarkTimingData), [benchmarkTimingData]);

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
        traceMinNs: t?.minNs ?? 0,
        traceMaxNs: t?.maxNs ?? 0,
        benchHits: b?.hits ?? 0,
        benchTotalNs: b?.totalNs ?? 0,
        benchAvgPerPassNs: b?.avgPerPassNs ?? 0,
        benchAvgPerCallNs: b?.avgPerCallNs ?? 0,
      };
    });

    const comp = {
      time: (a, b) => (b.traceTotalNs || b.benchTotalNs) - (a.traceTotalNs || a.benchTotalNs),
      calls: (a, b) => (b.traceCallCount || b.benchHits) - (a.traceCallCount || a.benchHits),
      avg: (a, b) => (b.traceAvgNs || b.benchAvgPerCallNs) - (a.traceAvgNs || a.benchAvgPerCallNs),
      bench: (a, b) => b.benchAvgPerPassNs - a.benchAvgPerPassNs,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sortBy] || ((a, b) => (b.traceTotalNs || b.benchTotalNs) - (a.traceTotalNs || a.benchTotalNs));

    return sortAsc ? [...arr].sort((a, b) => -comp(a, b)) : [...arr].sort(comp);
  }, [traceMap, benchmarkMap, sortBy, sortAsc]);

  const traceTotalNs = useMemo(() => rows.reduce((sum, row) => sum + row.traceTotalNs, 0), [rows]);
  const benchTotalNs = useMemo(() => rows.reduce((sum, row) => sum + row.benchTotalNs, 0), [rows]);
  const displayTotalNs = traceTotalNs > 0 ? traceTotalNs : benchTotalNs;

  const hasTrace = traceTotalNs > 0;
  const hasBenchmark = !!benchmarkTimingData && benchmarkMap.size > 0;
  const hasData = rows.length > 0;

  const handleSortClick = (col) => {
    if (sortBy === col) {
      setSortAsc((a) => !a);
    } else {
      setSortBy(col);
      setSortAsc(false);
    }
  };

  const SortIndicator = ({ col }) => {
    if (sortBy !== col) return <span className="timing-sort-indicator inactive">↕</span>;
    return <span className="timing-sort-indicator">{sortAsc ? '↑' : '↓'}</span>;
  };

  return (
    <div className="timing-panel">
      <div className="timing-panel-header">
        <span className="timing-panel-title">Function Timings</span>
        {hasTrace && <span className="timing-panel-total">Trace total: {formatNs(traceTotalNs)}</span>}
        {hasBenchmark && <span className="timing-panel-total">Benchmark total: {formatNs(benchTotalNs)}</span>}
        <button className="timing-panel-close btn-icon" onClick={onClose} title="Close timing panel">✕</button>
      </div>

      {hasBenchmark && (
        <div className="timing-panel-benchmark-meta">
          <span className="timing-benchmark-source" title={benchmarkTimingFileName || 'manual import'}>
            Benchmark source: {benchmarkTimingFileName || 'manual import'}
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
          <small>Timings are captured by <code>logBegins</code>/<code>logEnds</code> macros.</small>
        </div>
      )}

      {hasData && (
        <div className="timing-panel-body">
          {/* Bar chart: trace total if available, otherwise benchmark total */}
          <div className="timing-chart">
            {rows.map((row) => {
              const rowTotal = row.traceTotalNs > 0 ? row.traceTotalNs : row.benchTotalNs;
              const pct = displayTotalNs > 0 ? (rowTotal / displayTotalNs) * 100 : 0;
              return (
                <div
                  key={row.name}
                  className="timing-chart-row"
                  title={`${row.name}\nTrace total: ${formatNs(row.traceTotalNs)}\nTrace calls: ${row.traceCallCount}\nBenchmark total: ${formatNs(row.benchTotalNs)}\nBenchmark avg/pass: ${formatNs(row.benchAvgPerPassNs)}\nBenchmark avg/call: ${formatNs(row.benchAvgPerCallNs)}`}
                  onClick={() => onFocusFn && onFocusFn(row.name)}
                >
                  <span className="timing-chart-label" title={row.name}>{row.name}</span>
                  <div className="timing-chart-bar-track">
                    <div className="timing-chart-bar" style={{ width: `${pct.toFixed(2)}%` }} />
                  </div>
                  <span className="timing-chart-value">{formatNs(rowTotal)}</span>
                  <span className="timing-chart-pct">{pct < 0.1 ? '<0.1' : pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <table className="timing-table">
            <thead>
              <tr>
                <th className="timing-th timing-th-name" onClick={() => handleSortClick('name')}>Function <SortIndicator col="name" /></th>
                <th className="timing-th timing-th-calls" onClick={() => handleSortClick('calls')}>Calls <SortIndicator col="calls" /></th>
                <th className="timing-th timing-th-total" onClick={() => handleSortClick('time')}>Trace total <SortIndicator col="time" /></th>
                <th className="timing-th timing-th-avg" onClick={() => handleSortClick('avg')}>Trace avg/call <SortIndicator col="avg" /></th>
                <th className="timing-th timing-th-avg" onClick={() => handleSortClick('bench')}>Bench avg/pass <SortIndicator col="bench" /></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = displayTotalNs > 0 ? ((row.traceTotalNs > 0 ? row.traceTotalNs : row.benchTotalNs) / displayTotalNs) * 100 : 0;
                const isHot = pct >= 20;
                const isWarm = pct >= 5;
                return (
                  <tr
                    key={row.name}
                    className={`timing-tr${isHot ? ' hot' : isWarm ? ' warm' : ''}`}
                    title={`Trace min/max: ${formatNs(row.traceMinNs)} / ${formatNs(row.traceMaxNs)}\nBenchmark avg/call: ${formatNs(row.benchAvgPerCallNs)}`}
                    onClick={() => onFocusFn && onFocusFn(row.name)}
                  >
                    <td className="timing-td timing-td-name">
                      <span className={`timing-heat-dot${isHot ? ' hot' : isWarm ? ' warm' : ''}`} />
                      {row.name}
                    </td>
                    <td className="timing-td timing-td-calls">{(row.traceCallCount || row.benchHits).toLocaleString()}</td>
                    <td className="timing-td timing-td-total">{row.traceTotalNs > 0 ? formatNs(row.traceTotalNs) : '-'}</td>
                    <td className="timing-td timing-td-avg">{row.traceAvgNs > 0 ? formatNs(row.traceAvgNs) : '-'}</td>
                    <td className="timing-td timing-td-avg">{row.benchAvgPerPassNs > 0 ? formatNs(row.benchAvgPerPassNs) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
