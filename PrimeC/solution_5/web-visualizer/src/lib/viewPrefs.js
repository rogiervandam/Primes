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
  // 'off' | 'bit-clock' (click-only) | 'click-hover'
  balloonMode: 'click-hover',
  bitLabelMode: 'global',
  byteLabelMode: 'group',
  horizontalGroups: 0,
  outlines: {
    targets: [],
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
  strength: 50,
  angle: 35,
};

/**
 * Default canvas background colors per theme.
 * Null means "use the renderer's theme default" (THEMES[theme].BACKGROUND).
 * Only store an override when the user has explicitly chosen a custom color.
 */
export const DEFAULT_CANVAS_COLORS = {
  light: null,
  dark:  null,
};

/**
 * Default color-preset / custom-bit-color preferences.
 * `colorPreset` is a key into COLOR_PRESETS (e.g. 'default', 'pastel') or
 * null to use the theme default.
 * Each `customColors` entry is an [r,g,b] array override or null.
 */
export const DEFAULT_COLOR_PREFS = {
  colorPreset: null,
  customColors: { setBit: null, clearedBit: null, unchangedBit: null },
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
  const savedOutlines = saved.outlines || {};
  // Migrate legacy single-target string to targets array.
  let migratedTargets = savedOutlines.targets;
  if (!Array.isArray(migratedTargets)) {
    const legacyTarget = savedOutlines.target;
    migratedTargets = (legacyTarget && legacyTarget !== 'none') ? [legacyTarget] : [];
  }
  return {
    ...DEFAULT_LAYOUT_SETTINGS,
    ...saved,
    outlines: {
      ...DEFAULT_LAYOUT_SETTINGS.outlines,
      ...savedOutlines,
      targets: migratedTargets,
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
    // Always show the single-event widget on startup regardless of how it was
    // last hidden (user can dismiss it again via the ▼ button or by dragging it).
    visible: true,
    position: 'center', // user removed the position picker; always re-center as baseline
    scale,
    dragOffsetX,
    dragOffsetY,
    contextCollapsed: saved.contextCollapsed === true,
  };
}

/** Merge saved depth settings into defaults, clamping numeric ranges. */
export function mergeDepthSettings(saved) {
  if (!saved || typeof saved !== 'object') return DEFAULT_DEPTH_SETTINGS;

  const strengthRaw = saved.strength == null ? NaN : Number(saved.strength);
  const angleRaw = saved.angle == null ? NaN : Number(saved.angle);

  const strength = Number.isFinite(strengthRaw)
    ? Math.max(0, Math.min(100, strengthRaw))
    : DEFAULT_DEPTH_SETTINGS.strength;

  const angle = Number.isFinite(angleRaw)
    ? Math.max(0, Math.min(90, angleRaw))
    : DEFAULT_DEPTH_SETTINGS.angle;

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

import { clampInt as _clampInt } from './math.js';
import {
  DEFAULT_RENDER_MODE,
  normalizeRenderMode,
} from './renderModes.js';
function clampInt(value, lo, hi) { return _clampInt(value, lo, hi, null); }

function initialPlaySpeedPercent(prefs) {
  return clampInt(prefs?.playSpeedPercent, 1, 1600) ?? 100;
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

function initialGridOpacity(prefs) {
  const n = Number(prefs?.gridOpacity);
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.12, Math.min(1, n));
}

function initialAllEventsWidgetHidden(prefs) {
  return prefs?.isAllEventsWidgetHidden === true;
}

function initialWidgetsJoined(prefs) {
  return prefs?.areWidgetsJoined === true;
}

// Valid preset keys (mirrors COLOR_PRESETS in src/renderer/constants.js).
// Listed here to avoid a cross-module import from a lib/ utility.
const VALID_COLOR_PRESET_KEYS = new Set(['default', 'highContrast', 'pastel', 'darkMode']);

function initialColorPreset(prefs) {
  const v = prefs?.colorPreset;
  return (typeof v === 'string' && VALID_COLOR_PRESET_KEYS.has(v)) ? v : null;
}

function initialCustomColors(prefs) {
  const isValidRgb = (v) =>
    Array.isArray(v) && v.length === 3 &&
    v.every((c) => Number.isInteger(c) && c >= 0 && c <= 255);
  const saved = prefs?.customColors;
  return {
    setBit:       isValidRgb(saved?.setBit)       ? saved.setBit       : null,
    clearedBit:   isValidRgb(saved?.clearedBit)   ? saved.clearedBit   : null,
    unchangedBit: isValidRgb(saved?.unchangedBit) ? saved.unchangedBit : null,
  };
}

function initialCanvasColors(prefs) {
  const saved = prefs?.canvasColors;
  const isValidRgb = (v) => Array.isArray(v) && v.length === 3 && v.every(c => Number.isInteger(c) && c >= 0 && c <= 255);
  const lightRaw = saved?.light;
  const darkRaw  = saved?.dark;
  return {
    light: isValidRgb(lightRaw) ? lightRaw : null,
    dark:  isValidRgb(darkRaw)  ? darkRaw  : null,
  };
}

function initialDebugGlModeOverride(prefs) {
  const value = prefs?.debugGlModeOverride;
  return value === 'worker' || value === 'direct' ? value : 'auto';
}

function initialDebugWorkerGlyphMode(prefs) {
  const value = prefs?.debugWorkerGlyphMode;
  return value === 'gl' || value === 'separate-text' ? value : 'gl';
}

function initialRenderMode(prefs) {
  return normalizeRenderMode(prefs?.renderMode || DEFAULT_RENDER_MODE);
}

function initialDebugRenderTuning(prefs) {
  const tuning = prefs?.debugRenderTuning || {};
  const asNullableNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const asPercent = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 100;
  };
  const legacyDpr = asNullableNumber(tuning.dprOverride);
  const legacyGlW = asNullableNumber(tuning.glCssW);
  const legacyGlH = asNullableNumber(tuning.glCssH);
  const legacyOverlayW = asNullableNumber(tuning.overlayCssW);
  const legacyOverlayH = asNullableNumber(tuning.overlayCssH);
  const legacyGlyph2DW = asNullableNumber(tuning.glyph2DCssW);
  const legacyGlyph2DH = asNullableNumber(tuning.glyph2DCssH);
  const glAaScaleRaw = Number(tuning.glAaScale);
  return {
    dprPercent: asPercent(tuning.dprPercent),
    glPercent: asPercent(tuning.glPercent),
    overlayPercent: asPercent(tuning.overlayPercent),
    glyph2DPercent: asPercent(tuning.glyph2DPercent),
    glAaScale: (Number.isFinite(glAaScaleRaw) && glAaScaleRaw >= 1) ? glAaScaleRaw : 1,
    dprManualActive: tuning.dprManualActive === true || legacyDpr != null,
    dprManualValue: asNullableNumber(tuning.dprManualValue) ?? legacyDpr,
    glManualActive: tuning.glManualActive === true || legacyGlW != null || legacyGlH != null,
    glManualW: asNullableNumber(tuning.glManualW) ?? legacyGlW,
    glManualH: asNullableNumber(tuning.glManualH) ?? legacyGlH,
    overlayManualActive: tuning.overlayManualActive === true || legacyOverlayW != null || legacyOverlayH != null,
    overlayManualW: asNullableNumber(tuning.overlayManualW) ?? legacyOverlayW,
    overlayManualH: asNullableNumber(tuning.overlayManualH) ?? legacyOverlayH,
    glyph2DManualActive: tuning.glyph2DManualActive === true || legacyGlyph2DW != null || legacyGlyph2DH != null,
    glyph2DManualW: asNullableNumber(tuning.glyph2DManualW) ?? legacyGlyph2DW,
    glyph2DManualH: asNullableNumber(tuning.glyph2DManualH) ?? legacyGlyph2DH,
  };
}

function initialPanelVisibility(prefs) {
  // Migrate legacy key: stepsPanelCollapsed → isEventsPanelCollapsed.
  // Read new key first; fall back to old key for users with saved prefs.
  const legacyCollapsed = prefs?.stepsPanelCollapsed;
  const isEventsPanelCollapsed =
    prefs?.isEventsPanelCollapsed !== undefined
      ? prefs.isEventsPanelCollapsed !== false
      : legacyCollapsed !== false; // default: collapsed
  return {
    isEventsPanelCollapsed,
    isSettingsCollapsed: prefs?.isSettingsCollapsed !== false,     // default: collapsed
    isDetailOpen: prefs?.isDetailOpen === true,                    // default: closed
  };
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
    delayBetweenEvents: initialDelayMs(prefs, 'delayBetweenEvents'),
    delayBetweenRepeats: initialDelayMs(prefs, 'delayBetweenRepeats'),
    eventTimeTargets: mergeEventTimeTargets(prefs?.eventTimeTargets),
    eventDurationMode: initialEventDurationMode(prefs),
    gridOpacity: initialGridOpacity(prefs),
    canvasColors: initialCanvasColors(prefs),
    debugGlModeOverride: initialDebugGlModeOverride(prefs),
    debugWorkerGlyphMode: initialDebugWorkerGlyphMode(prefs),
    renderMode: initialRenderMode(prefs),
    debugRenderTuning: initialDebugRenderTuning(prefs),
    colorPreset: initialColorPreset(prefs),
    customColors: initialCustomColors(prefs),
    isAllEventsWidgetHidden: initialAllEventsWidgetHidden(prefs),
    areWidgetsJoined: initialWidgetsJoined(prefs),
    isAllEventsInDetailPanel: prefs?.isAllEventsInDetailPanel === true,
    isSingleEventRepeatEnabled: prefs?.isSingleEventRepeatEnabled !== false,
    // When false, selecting an event will NOT automatically start the
    // per-event animation loop. Default true to preserve prior behavior.
    isAutoAnimateOnSelect: prefs?.isAutoAnimateOnSelect !== false,
    ...initialPanelVisibility(prefs),
  };
}
