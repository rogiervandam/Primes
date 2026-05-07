export const RENDER_MODES = {
  MODE1_DIRECT: 'mode1-direct',
  MODE2_DIRECT: 'mode2-direct',
  MODE3_DIRECT: 'mode3-direct',
  MODE4_DIRECT: 'mode4-direct',
  MODE5_WORKER: 'mode5-worker',
  MODE6_WORKER: 'mode6-worker',
  MODE7_WORKER: 'mode7-worker',
  MODE8_WORKER: 'mode8-worker',
};

export const DEFAULT_RENDER_MODE = RENDER_MODES.MODE3_DIRECT;

export const RENDER_MODE_OPTIONS = [
  {
    value: RENDER_MODES.MODE1_DIRECT,
    label: '1. 2D text -> texture, flat (direct)',
  },
  {
    value: RENDER_MODES.MODE2_DIRECT,
    label: '2. 2D text -> texture + CSS tilt (direct)',
  },
  {
    value: RENDER_MODES.MODE3_DIRECT,
    label: '3. Single GL canvas + 3D shader (direct)',
  },
  {
    value: RENDER_MODES.MODE4_DIRECT,
    label: '4. Parallel text+grid canvases + CSS tilt (direct)',
  },
  {
    value: RENDER_MODES.MODE5_WORKER,
    label: '5. Mode 1 (worker lane)',
  },
  {
    value: RENDER_MODES.MODE6_WORKER,
    label: '6. Mode 2 (worker lane)',
  },
  {
    value: RENDER_MODES.MODE7_WORKER,
    label: '7. Single GL canvas + 3D shader (worker)',
  },
  {
    value: RENDER_MODES.MODE8_WORKER,
    label: '8. Mode 4 (worker lane)',
  },
];

const KNOWN_RENDER_MODES = new Set(Object.values(RENDER_MODES));

export function isRenderMode(value) {
  return typeof value === 'string' && KNOWN_RENDER_MODES.has(value);
}

export function normalizeRenderMode(value) {
  return isRenderMode(value) ? value : DEFAULT_RENDER_MODE;
}

export function getRenderModeBackendPreset(mode) {
  const normalized = normalizeRenderMode(mode);
  switch (normalized) {
    case RENDER_MODES.MODE1_DIRECT:
      return {
        glMode: 'direct',
        workerGlyphMode: 'gl',
      };
    case RENDER_MODES.MODE2_DIRECT:
    case RENDER_MODES.MODE4_DIRECT:
      return {
        glMode: 'direct',
        workerGlyphMode: 'separate-text',
      };
    case RENDER_MODES.MODE3_DIRECT:
      return {
        glMode: 'direct',
        workerGlyphMode: 'gl',
      };
    case RENDER_MODES.MODE5_WORKER:
      return {
        glMode: 'worker',
        workerGlyphMode: 'gl',
      };
    case RENDER_MODES.MODE6_WORKER:
    case RENDER_MODES.MODE8_WORKER:
      return {
        glMode: 'worker',
        workerGlyphMode: 'separate-text',
      };
    case RENDER_MODES.MODE7_WORKER:
    default:
      return {
        glMode: 'worker',
        workerGlyphMode: 'gl',
      };
  }
}

export function usesWebGLTilt(mode) {
  const normalized = normalizeRenderMode(mode);
  return normalized === RENDER_MODES.MODE1_DIRECT
    || normalized === RENDER_MODES.MODE3_DIRECT
    || normalized === RENDER_MODES.MODE5_WORKER
    || normalized === RENDER_MODES.MODE7_WORKER;
}

/**
 * Returns true for modes that render everything into a single viewport-sized
 * WebGL canvas (no oversized drag-headroom plane, no separate glyph overlay).
 * Grid cells, text, overlays, and 3D transform are all done by the bit-grid
 * GL context; the glyph-render-canvas is hidden.
 */
export function usesViewportSizeCanvas(mode) {
  const normalized = normalizeRenderMode(mode);
  return normalized === RENDER_MODES.MODE3_DIRECT
    || normalized === RENDER_MODES.MODE7_WORKER;
}
