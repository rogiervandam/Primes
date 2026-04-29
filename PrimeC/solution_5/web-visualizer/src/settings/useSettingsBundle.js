import { useMemo } from 'react';

/**
 * useSettingsBundle — packages the `(settings, onChange)` pair used by
 * the settings tabs into a small bundle of helpers so individual tabs
 * don't need to redefine `set` / `incr` / `decr` boilerplate inline.
 *
 * Returned bundle:
 *   - `s`             current settings object (never null; falls back to {})
 *   - `set(k, v)`     replace a single key
 *   - `setMany(p)`    shallow-merge a patch object (multi-key update)
 *   - `incr(k, max)`  numeric nudge up, clamped at `max`
 *   - `decr(k, min)`  numeric nudge down, clamped at `min` (default 0)
 *
 * Notes:
 *  - The hook intentionally captures `settings` by value at call time
 *    inside each closure, matching the behaviour of the inline helpers
 *    it replaces (which read `s` from the parent's render scope).
 *  - The bundle identity changes on every render — that's fine for the
 *    current consumers, which never put it in a `useEffect` dep array.
 *    If you start passing pieces into memoised children, switch to
 *    individual `useCallback`s here.
 */
export function useSettingsBundle(settings, onChange) {
  const s = settings || {};
  return useMemo(() => ({
    s,
    set: (key, val) => onChange({ ...s, [key]: val }),
    setMany: (patch) => onChange({ ...s, ...patch }),
    incr: (key, max) => onChange({ ...s, [key]: Math.min(max, (s[key] || 0) + 1) }),
    decr: (key, min = 0) => onChange({ ...s, [key]: Math.max(min, (s[key] || 0) - 1) }),
  }), [s, onChange]);
}

export default useSettingsBundle;
