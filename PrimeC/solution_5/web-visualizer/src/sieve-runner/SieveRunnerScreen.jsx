/**
 * SieveRunnerScreen
 *
 * A self-contained screen that lets the user launch PrimeC/solution_5 sieve
 * trace jobs in a local Docker container and automatically load the resulting
 * trace files into the visualizer.
 *
 * This module and its companions in src/sieve-runner/ are intentionally kept
 * separate from the main visualizer codebase so they can be toggled / removed
 * without side-effects.
 *
 * Props:
 *   onLoadTrace(name: string): void   — called when the user wants to open a trace
 *   onClose(): void                   — called when the user dismisses the screen
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SieveRunnerScreen.css';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1500;

const TRACE_LEVEL_LABELS = {
  5: '5 — minimal',
  6: '6 — basic',
  7: '7 — normal',
  8: '8 — detailed',
  9: '9 — full (recommended)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(startedAt, endedAt) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const ms = end - start;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusBadgeClass(status) {
  switch (status) {
    case 'running': return 'sr-badge sr-badge--running';
    case 'completed': return 'sr-badge sr-badge--completed';
    case 'failed': return 'sr-badge sr-badge--failed';
    case 'cancelled': return 'sr-badge sr-badge--cancelled';
    default: return 'sr-badge';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function DockerStatusBanner({ status, isLoading }) {
  if (isLoading) {
    return <div className="sr-status-banner sr-status-banner--checking">Checking Docker status…</div>;
  }
  if (!status) return null;

  if (!status.dockerAvailable) {
    return (
      <div className="sr-status-banner sr-status-banner--error">
        <strong>Docker not found.</strong> Install Docker and make sure the{' '}
        <code>docker</code> command is available in the server's PATH.
      </div>
    );
  }
  if (!status.imageAvailable) {
    return (
      <div className="sr-status-banner sr-status-banner--warn">
        <strong>Docker image not built.</strong> Build it once with:
        <pre className="sr-inline-pre">./sieve docker default</pre>
        Then refresh.
      </div>
    );
  }
  return (
    <div className="sr-status-banner sr-status-banner--ok">
      Docker ready · image <code>{status.imageName}</code>
    </div>
  );
}

function JobRow({ job, onLoad, onCancel }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = job.status === 'running';

  return (
    <div className={`sr-job-row sr-job-row--${job.status}`}>
      <div className="sr-job-row-header">
        <span className="sr-job-variant">{job.variant}</span>
        <span className="sr-job-size">{job.sieveSize.toLocaleString()}</span>
        <span className={statusBadgeClass(job.status)}>{job.status}</span>
        <span className="sr-job-duration">
          {formatDuration(job.startedAt, job.endedAt)}
        </span>
        <span className="sr-job-actions">
          {job.status === 'completed' && job.outputFile && (
            <button
              className="sr-btn sr-btn--primary"
              onClick={() => onLoad(job.outputFile)}
            >
              Load trace
            </button>
          )}
          {isRunning && (
            <button
              className="sr-btn sr-btn--danger"
              onClick={() => onCancel(job.id)}
            >
              Cancel
            </button>
          )}
          {job.logs?.length > 0 && (
            <button
              className="sr-btn sr-btn--secondary"
              onClick={() => setIsExpanded((v) => !v)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Hide logs' : 'Logs'}
            </button>
          )}
        </span>
      </div>
      {isExpanded && job.logs?.length > 0 && (
        <pre className="sr-job-logs">
          {job.logs.join('\n')}
        </pre>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SieveRunnerScreen({ onLoadTrace, onClose }) {
  const [dockerStatus, setDockerStatus] = useState(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Form state
  const [selectedVariant, setSelectedVariant] = useState('sieve_wheelstorage');
  const [sieveSize, setSieveSize] = useState('10000');
  const [traceLevel, setTraceLevel] = useState('9');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Job list
  const [jobs, setJobs] = useState([]);
  const pollRef = useRef(null);

  // ── Fetch Docker status ───────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/sieve/status');
      if (res.ok) setDockerStatus(await res.json());
    } catch {
      // Server may not have the sieve API (e.g., static build) — silently ignore.
    } finally {
      setIsStatusLoading(false);
    }
  }, []);

  // ── Fetch jobs ────────────────────────────────────────────────────────────
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/sieve/jobs');
      if (res.ok) setJobs(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchJobs();
  }, [fetchStatus, fetchJobs]);

  // Poll while any job is running.
  useEffect(() => {
    const hasRunning = jobs.some((j) => j.status === 'running');
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchJobs, POLL_INTERVAL_MS);
    } else if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobs, fetchJobs]);

  // ── Run button ────────────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setSubmitError('');
    const size = Number(sieveSize);
    if (!Number.isInteger(size) || size < 10 || size > 10_000_000) {
      setSubmitError('Sieve size must be an integer between 10 and 10,000,000.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sieve/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: selectedVariant,
          sieveSize: size,
          traceLevel: Number(traceLevel),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(data.error || 'Failed to start job.');
      } else {
        await fetchJobs();
      }
    } catch (err) {
      setSubmitError(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedVariant, sieveSize, traceLevel, fetchJobs]);

  // ── Cancel job ────────────────────────────────────────────────────────────
  const handleCancel = useCallback(async (jobId) => {
    try {
      await fetch(`/api/sieve/jobs/${encodeURIComponent(jobId)}/cancel`, {
        method: 'POST',
      });
      await fetchJobs();
    } catch {
      // ignore
    }
  }, [fetchJobs]);

  // ── Load trace ────────────────────────────────────────────────────────────
  const handleLoad = useCallback(
    (name) => {
      onClose();
      onLoadTrace(name);
    },
    [onClose, onLoadTrace]
  );

  const canRun =
    dockerStatus?.dockerAvailable &&
    dockerStatus?.imageAvailable &&
    !isSubmitting;

  const variants = dockerStatus?.variants ?? [];

  return (
    <div className="sr-screen">
      <div className="sr-header">
        <h2 className="sr-title">Run Sieve in Docker</h2>
        <button className="sr-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <DockerStatusBanner status={dockerStatus} isLoading={isStatusLoading} />

      {/* ── Run form ── */}
      <div className="sr-form">
        <div className="sr-form-row">
          <label className="sr-label" htmlFor="sr-variant">Variant</label>
          <select
            id="sr-variant"
            className="sr-select"
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            disabled={!canRun}
          >
            {(variants.length > 0 ? variants : [selectedVariant]).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="sr-form-row">
          <label className="sr-label" htmlFor="sr-size">Sieve size</label>
          <input
            id="sr-size"
            className="sr-input"
            type="number"
            min="10"
            max="10000000"
            step="1"
            value={sieveSize}
            onChange={(e) => setSieveSize(e.target.value)}
            disabled={!canRun}
          />
        </div>

        <div className="sr-form-row">
          <label className="sr-label" htmlFor="sr-level">Trace level</label>
          <select
            id="sr-level"
            className="sr-select"
            value={traceLevel}
            onChange={(e) => setTraceLevel(e.target.value)}
            disabled={!canRun}
          >
            {Object.entries(TRACE_LEVEL_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>

        <div className="sr-form-actions">
          <button
            className="sr-btn sr-btn--run"
            onClick={handleRun}
            disabled={!canRun || isSubmitting}
          >
            {isSubmitting ? 'Starting…' : 'Run'}
          </button>
          {submitError && <span className="sr-error">{submitError}</span>}
        </div>
      </div>

      {/* ── Job list ── */}
      {jobs.length > 0 && (
        <div className="sr-jobs">
          <h3 className="sr-jobs-title">Jobs</h3>
          <div className="sr-jobs-list">
            {[...jobs].reverse().map((job) => (
              <JobRow
                key={job.id}
                job={job}
                onLoad={handleLoad}
                onCancel={handleCancel}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Help ── */}
      <div className="sr-help">
        <p>
          Build the Docker image once with{' '}
          <code>./sieve docker default</code>, then use this screen to generate
          trace files for any variant and sieve size. Completed traces are
          automatically available in the log picker.
        </p>
      </div>
    </div>
  );
}
