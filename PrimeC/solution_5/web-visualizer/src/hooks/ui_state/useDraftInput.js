/**
 * useDraftInput — keep an editable string draft of an externally-controlled value.
 *
 * Pattern used throughout SettingsPanel:
 *   - Parent owns the "real" value (e.g. range start / multiples prime).
 *   - User edits a free-form text input — keep their typing local.
 *   - On commit (blur / Enter), parse + clamp + push back to the parent.
 *   - When the parent value changes from outside, sync back to the draft.
 *
 * Usage:
 *   const start = useDraftInput(rangeOverlayStart, onRangeOverlayStartChange);
 *   <input value={start.draft}
 *          onChange={(e) => start.setDraft(e.target.value)}
 *          onBlur={() => start.commit()} />
 *
 * Options:
 *   parse(string) -> any           // default: parseInt with NaN→0
 *   clamp(parsed) -> any           // default: identity
 *   format(value) -> string        // default: String()
 */
import { useCallback, useEffect, useState } from 'react';

const defaultParse = (s) => {
  const n = parseInt(s ?? '0', 10);
  return Number.isFinite(n) ? n : 0;
};

export function useDraftInput(externalValue, onCommit, options = {}) {
  const parse = options.parse || defaultParse;
  const clamp = options.clamp || ((v) => v);
  const format = options.format || String;

  const [draft, setDraft] = useState(() => format(externalValue));

  // Re-sync when the parent value changes from outside (e.g. step defaults).
  useEffect(() => {
    setDraft(format(externalValue));
  }, [externalValue, format]);

  const commit = useCallback((rawOverride) => {
    const raw = rawOverride !== undefined ? rawOverride : draft;
    const value = clamp(parse(raw));
    setDraft(format(value));
    onCommit(value);
    return value;
  }, [draft, parse, clamp, format, onCommit]);

  return { draft, setDraft, commit };
}
