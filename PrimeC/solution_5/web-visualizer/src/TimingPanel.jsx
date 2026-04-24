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
 * Aggregate timing data from the flat steps array.
 * Groups by `operation` field (function name).
 * Only counts steps where elapsedNs > 0 (i.e., logEnds events).
 */
function aggregateTimings(steps) {
  const byFunction = new Map(); // funcName → { totalNs, callCount, minNs, maxNs }

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
 * TimingPanel — shows a breakdown of timings per function as a bar chart + table.
 *
 * Props:
 *   steps        — parsed step array from trace
 *   onClose      — called when close button clicked
 *   onFocusFn    — called with function name when user clicks a row (optional)
 */
export default function TimingPanel({ steps, onClose, onFocusFn }) {
  const [sortBy, setSortBy] = useState('time'); // 'time' | 'calls' | 'avg' | 'name'
  const [sortAsc, setSortAsc] = useState(false);

  const aggregated = useMemo(() => aggregateTimings(steps), [steps]);

  const rows = useMemo(() => {
    const arr = Array.from(aggregated.entries()).map(([name, data]) => ({
      name,
      totalNs: data.totalNs,
      callCount: data.callCount,
      avgNs: data.callCount > 0 ? data.totalNs / data.callCount : 0,
      minNs: data.minNs,
      maxNs: data.maxNs,
    }));

    const comp = {
      time: (a, b) => b.totalNs - a.totalNs,
      calls: (a, b) => b.callCount - a.callCount,
      avg: (a, b) => b.avgNs - a.avgNs,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sortBy] || ((a, b) => b.totalNs - a.totalNs);

    return sortAsc ? [...arr].sort((a, b) => -comp(a, b)) : [...arr].sort(comp);
  }, [aggregated, sortBy, sortAsc]);

  const grandTotalNs = useMemo(() => {
    let sum = 0;
    for (const row of rows) sum += row.totalNs;
    return sum;
  }, [rows]);

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
        {grandTotalNs > 0 && (
          <span className="timing-panel-total">Total: {formatNs(grandTotalNs)}</span>
        )}
        <button className="timing-panel-close btn-icon" onClick={onClose} title="Close timing panel">✕</button>
      </div>

      {!hasData && (
        <div className="timing-panel-empty">
          No timing data available in this trace.<br />
          <small>Timings are captured by <code>logBegins</code>/<code>logEnds</code> macros.</small>
        </div>
      )}

      {hasData && (
        <div className="timing-panel-body">
          {/* Bar chart */}
          <div className="timing-chart">
            {rows.map((row) => {
              const pct = grandTotalNs > 0 ? (row.totalNs / grandTotalNs) * 100 : 0;
              return (
                <div
                  key={row.name}
                  className="timing-chart-row"
                  title={`${row.name}\nTotal: ${formatNs(row.totalNs)}\nCalls: ${row.callCount}\nAvg: ${formatNs(row.avgNs)}\nMin: ${formatNs(row.minNs)}\nMax: ${formatNs(row.maxNs)}`}
                  onClick={() => onFocusFn && onFocusFn(row.name)}
                >
                  <span className="timing-chart-label" title={row.name}>{row.name}</span>
                  <div className="timing-chart-bar-track">
                    <div
                      className="timing-chart-bar"
                      style={{ width: `${pct.toFixed(2)}%` }}
                    />
                  </div>
                  <span className="timing-chart-value">{formatNs(row.totalNs)}</span>
                  <span className="timing-chart-pct">{pct < 0.1 ? '<0.1' : pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <table className="timing-table">
            <thead>
              <tr>
                <th className="timing-th timing-th-name" onClick={() => handleSortClick('name')}>
                  Function <SortIndicator col="name" />
                </th>
                <th className="timing-th timing-th-calls" onClick={() => handleSortClick('calls')}>
                  Calls <SortIndicator col="calls" />
                </th>
                <th className="timing-th timing-th-total" onClick={() => handleSortClick('time')}>
                  Total <SortIndicator col="time" />
                </th>
                <th className="timing-th timing-th-avg" onClick={() => handleSortClick('avg')}>
                  Avg <SortIndicator col="avg" />
                </th>
                <th className="timing-th timing-th-pct">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pct = grandTotalNs > 0 ? (row.totalNs / grandTotalNs) * 100 : 0;
                const isHot = pct >= 20;
                const isWarm = pct >= 5;
                return (
                  <tr
                    key={row.name}
                    className={`timing-tr${isHot ? ' hot' : isWarm ? ' warm' : ''}`}
                    title={`Min: ${formatNs(row.minNs)} / Max: ${formatNs(row.maxNs)}`}
                    onClick={() => onFocusFn && onFocusFn(row.name)}
                  >
                    <td className="timing-td timing-td-name">
                      <span className={`timing-heat-dot${isHot ? ' hot' : isWarm ? ' warm' : ''}`} />
                      {row.name}
                    </td>
                    <td className="timing-td timing-td-calls">{row.callCount.toLocaleString()}</td>
                    <td className="timing-td timing-td-total">{formatNs(row.totalNs)}</td>
                    <td className="timing-td timing-td-avg">{formatNs(row.avgNs)}</td>
                    <td className="timing-td timing-td-pct">{pct < 0.1 ? '<0.1' : pct.toFixed(1)}%</td>
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
