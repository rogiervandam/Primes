/**
 * useRawSource — manages on-demand loading of the raw log source text.
 *
 * Owns:
 *  - rawSourceCacheRef: in-memory cache so we only fetch once per session
 *  - rawSourceForLog (state): triggers re-render when source is loaded
 *  - fetchRawSource: callback used by TraceInfoPopover
 *  - lineToStep / stepToLine: memos mapping raw-source lines ↔ step indices
 */
import { useRef, useState, useCallback, useMemo } from 'react';

export function useRawSource({ sourceRef, steps }) {
  const rawSourceCacheRef = useRef(null);
  const [rawSourceForLog, setRawSourceForLog] = useState(null);

  // Callback used by TraceInfoPopover to request the raw source.
  const fetchRawSource = useCallback(async () => {
    if (rawSourceCacheRef.current) return rawSourceCacheRef.current;
    if (!sourceRef) return null;
    try {
      let text = null;
      if (sourceRef.type === 'api') {
        const res = await fetch(`/api/logs/${encodeURIComponent(sourceRef.name)}`);
        if (res.ok) text = await res.text();
      } else if (sourceRef.type === 'file') {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(sourceRef.file);
        });
      }
      if (text) {
        rawSourceCacheRef.current = text;
        setRawSourceForLog(text);
      }
      return text;
    } catch {
      return null;
    }
  }, [sourceRef]);

  // Map raw-source line indices to step indices.
  const lineToStep = useMemo(() => {
    if (!rawSourceForLog || !steps.length) return {};
    const rawLines = rawSourceForLog.split(/\r?\n/);
    const map = {};
    const usedLines = new Set();
    for (let s = 0; s < steps.length; s++) {
      const ann = (steps[s].annotation || '').trim();
      if (!ann) continue;
      for (let l = 0; l < rawLines.length; l++) {
        if (usedLines.has(l)) continue;
        const raw = rawLines[l];
        if (raw.trim() === ann) {
          map[l] = s;
          usedLines.add(l);
          break;
        }
        const kvMatch = raw.match(/\bannotation="([^"]*)"/);
        if (kvMatch && kvMatch[1].trim() === ann) {
          map[l] = s;
          usedLines.add(l);
          break;
        }
        const newStyleMatch = raw.match(/^(.+?)\s*\{[^}]*"?traceline"?\s*:/);
        if (newStyleMatch && newStyleMatch[1].trim() === ann) {
          map[l] = s;
          usedLines.add(l);
          break;
        }
      }
    }
    return map;
  }, [rawSourceForLog, steps]);

  // Inverted map: step index → raw-source line index (first matching line).
  const stepToLine = useMemo(() => {
    const m = {};
    for (const [lineStr, stepIdx] of Object.entries(lineToStep)) {
      const lineNum = Number(lineStr);
      if (!(stepIdx in m)) m[stepIdx] = lineNum;
    }
    return m;
  }, [lineToStep]);

  return { rawSourceForLog, lineToStep, stepToLine, fetchRawSource };
}
