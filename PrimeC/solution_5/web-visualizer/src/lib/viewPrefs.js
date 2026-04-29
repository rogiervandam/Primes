/**
 * View preferences: localStorage-backed persistence of UI settings that
 * survive between sessions. All knowledge of the storage key, default
 * values, and per-section merge/validation lives here so that React
 * components can stay focused on rendering and interaction.
 *
 * Each `merge*` helper takes a possibly-stale or partial object loaded
 * from storage and returns a fully populated, validated copy.
 */

export const VIEW_PREFS_KEY = 'sieve-visualizer:view-preferences:v1';

/**
 * Default per-event "normal" time targets keyed by change-count tier.
 * These are the times the timeline takes 0 -> 100% at 100% speed.
 * At 50% speed durations double; at 200% speed they halve. Each tier may be
 * adjusted in the Settings panel.
 */
export const DEFAULT_EVENT_TIME_TARGETS = {
  none: 250,    // 0 changes
  one: 500,     // 1 change
  two: 1000,    // 2 changes
  few: 2000,    // 3-10 changes
  many: 4000,   // 11-100 changes
  lots: 8000,   // > 100 changes (also the soft maximum for huge events)
  min: 200,     // hard floor — the result is clamped at least this large
  max: 15000,   // hard ceiling — the result is clamped at most this large
};

export const DEFAULT_LAYOUT_SETTINGS = {
  bitLayout: '4x2',
  byteLayout: '4x2',
  bitSpacingH: 1,
  bitSpacingV: 1,
  byteSpacingH: 2,
  byteSpacingV: 2,
  u64SpacingH: 4,
  u64SpacingV: 4,
  vectorMode: 'preset',
  vectorGroup: 1,
  vectorBaseBits: 64,
  vectorLanes: 1,
  vectorLabel: 'uint64',
  customGroupBits: 0,
  showBitLabels: true,
  showNumberLabels: false,
  showByteLabels: true,
  showVectorLabels: true,
  showVectorTouchOrder: false,
  bitLabelMode: 'global',
  byteLabelMode: 'group',
  horizontalGroups: 0,
  outlines: {
    target: 'none',
  },
};

export const DEFAULT_EVENT_TITLE_SETTINGS = {
  visible: true,
  position: 'center',
  scale: 100,
  // User-drag offset in pixels from the default (centered) position. Persisted.
  dragOffsetX: 0,
  dragOffsetY: 0,
  // Whether the 5-event context preview is collapsed inside the banner.
  contextCollapsed: false,
};

export const DEFAULT_DEPTH_SETTINGS = {
  strength: 80,
  angle: 38,
};

/** Read raw preferences object from localStorage (or null on failure). */
export function readViewPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(VIEW_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Write preferences object to localStorage. Silently ignores quota/disabled errors. */
export function writeViewPrefs(prefs) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(VIEW_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures.
  }
}

/** Merge saved event-time-target overrides into the defaults, clamping invalid values. */
export function mergeEventTimeTargets(saved) {
  const out = { ...DEFAULT_EVENT_TIME_TARGETS };
  if (!saved || typeof saved !== 'object') return out;
  for (const k of Object.keys(DEFAULT_EVENT_TIME_TARGETS)) {
    const v = Number(saved[k]);
    if (Number.isFinite(v) && v >= 0) out[k] = Math.max(0, Math.round(v));
  }
  // Sanity: keep min <= max.
  if (out.min > out.max) {
    const tmp = out.min; out.min = out.max; out.max = tmp;
  }
  return out;
}

/** Merge saved layout settings into the defaults (deep-merges the `outlines` group). */
export function mergeLayoutSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_LAYOUT_SETTINGS;
  return {
    ...DEFAULT_LAYOUT_SETTINGS,
    ...saved,
    outlines: {
      ...DEFAULT_LAYOUT_SETTINGS.outlines,
      ...(saved.outlines || {}),
    },
  };
}

/** Merge saved event-title settings into the defaults, validating numeric ranges. */
export function mergeEventTitleSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_EVENT_TITLE_SETTINGS;
  const scale = Math.max(70, Math.min(160,
    parseInt(saved.scale || DEFAULT_EVENT_TITLE_SETTINGS.scale, 10) || DEFAULT_EVENT_TITLE_SETTINGS.scale));
  const dragOffsetX = Number.isFinite(Number(saved.dragOffsetX)) ? Number(saved.dragOffsetX) : 0;
  const dragOffsetY = Number.isFinite(Number(saved.dragOffsetY)) ? Number(saved.dragOffsetY) : 0;
  return {
    ...DEFAULT_EVENT_TITLE_SETTINGS,
    ...saved,
    visible: saved.visible !== false,
    position: 'center', // user removed the position picker; always re-center as baseline
    scale,
    dragOffsetX,
    dragOffsetY,
    contextCollapsed: saved.contextCollapsed === true,
  };
}

/** Merge saved depth settings into the defaults, clamping strength/angle. */
export function mergeDepthSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_DEPTH_SETTINGS;
  const strength = Math.max(0, Math.min(100,
    parseInt(saved.strength ?? DEFAULT_DEPTH_SETTINGS.strength, 10) || DEFAULT_DEPTH_SETTINGS.strength));
  const angle = Math.max(0, Math.min(90,
    parseInt(saved.angle ?? DEFAULT_DEPTH_SETTINGS.angle, 10) || DEFAULT_DEPTH_SETTINGS.angle));
  return {
    ...DEFAULT_DEPTH_SETTINGS,
    ...saved,
    strength,
    angle,
  };
}

// --- Per-field initialiser helpers --------------------------------------
// Each helper takes the raw `prefs` object (possibly null) returned by
// `readViewPrefs()` and produces the validated, clamped, migration-aware
// initial value for the corresponding piece of UI state. Centralising these
// here keeps `Visualizer.jsx`'s `useState` lazy initialisers trivial and
// makes the schema's evolution rules visible in one place.

function clampInt(value, lo, hi) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function initialPlaySpeedPercent(prefs) {
  return clampInt(prefs?.playSpeedPercent, 25, 400) ?? 100;
}

function initialTheme(prefs) {
  return prefs?.theme === 'light' ? 'light' : 'dark';
}

// `delayBetweenEvents` and `delayBetweenRepeats` both fall back to the legacy
// single `repeatAnim` setting when the new explicit field is absent.
function initialDelayMs(prefs, key) {
  const explicit = clampInt(prefs?.[key], 0, 5000);
  if (explicit !== null) return explicit;
  const legacy = clampInt(prefs?.repeatAnim, 0, 5000);
  if (legacy !== null) return legacy;
  return 500;
}

function initialEventDurationMode(prefs) {
  return prefs?.eventDurationMode === 'linear' ? 'linear' : 'progressive';
}

function initialMaxStepDurationEnabled(prefs) {
  return prefs?.maxStepDurationEnabled === true;
}

function initialMaxStepDurationMs(prefs) {
  return clampInt(prefs?.maxStepDurationMs, 2000, 30000) ?? 8000;
}

function initialGridOpacity(prefs) {
  const n = Number(prefs?.gridOpacity);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.12, Math.min(1, n));
}

/**
 * Read prefs once and resolve every piece of persisted UI state into a flat
 * bundle. Use this from a single `useMemo(() => getInitialViewState(), [])`
 * in the consuming component, then pass each field as the seed of its own
 * `useState` (no lazy initialiser needed since the work is already done).
 *
 * Adding a new persisted field? Add it to the bundle here, add a default,
 * and add it to the write payload in `Visualizer.jsx`'s persistence effect.
 */
export function getInitialViewState() {
  const prefs = readViewPrefs();
  return {
    playSpeedPercent: initialPlaySpeedPercent(prefs),
    theme: initialTheme(prefs),
    layoutSettings: mergeLayoutSettings(prefs?.layoutSettings),
    eventTitleSettings: mergeEventTitleSettings(prefs?.eventTitleSettings),
    depthSettings: mergeDepthSettings(prefs?.depthSettings),
    delayBetweenEvents: initialDelayMs(prefs, 'delayBetweenEvents'),
    delayBetweenRepeats: initialDelayMs(prefs, 'delayBetweenRepeats'),
    eventTimeTargets: mergeEventTimeTargets(prefs?.eventTimeTargets),
    eventDurationMode: initialEventDurationMode(prefs),
    maxStepDurationEnabled: initialMaxStepDurationEnabled(prefs),
    maxStepDurationMs: initialMaxStepDurationMs(prefs),
    gridOpacity: initialGridOpacity(prefs),
  };
}
