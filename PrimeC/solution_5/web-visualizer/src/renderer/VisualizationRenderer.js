/**
 * VisualizationRenderer — abstract contract that any visualization mode must
 * implement to be drop-in compatible with `Visualizer.jsx`.
 *
 * The current implementation (`SieveRenderer.js`) targets a 2D bit-grid view
 * of a Sieve of Eratosthenes. To enable additional modes (timeline view,
 * dependency graph, single combined heatmap, etc.), implement this contract
 * in a new file under `src/renderers/` and let the visualizer pick between
 * them at construction time.
 *
 * NOTE: this file is documentation-as-code. JavaScript has no abstract-class
 * enforcement — methods that throw simply make accidental misuse loud.
 * Duck-typing is fine in practice; treat this file as the spec to read.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  Lifecycle
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   const r = new MyRenderer();
 *   r.attach(canvas);                  // main draw target
 *   r.attachSettledCanvas?.(c2);       // optional secondary canvas (depth)
 *   r.attachMinimapCanvas?.(c3);       // optional minimap canvas
 *   r.init(bitCount, sieveSize);
 *   r.resize(width, height);           // call on window resize / zoom changes
 *
 *   // Per playback step:
 *   r.currentOperation = step.operation;       // optional annotation channel
 *   r.setState(bitState, changedBits, targetBits, targetHitCounts,
 *              focusRange, maskMeta, options);
 *   r.render();
 *   r.renderMinimap?.(w, h, detailH);          // optional
 *
 *   // On-demand:
 *   const url = r.toDataURL();         // PNG snapshot (for export)
 *   const idx = r.canvasToBitIndex(x, y);
 *   const pos = r.bitIndexToCanvas(idx);
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  Public properties expected by Visualizer / hooks
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   canvas         HTMLCanvasElement              the main draw surface
 *   canvasWidth    number                          logical width (CSS px)
 *   bitCount       number
 *   sieveSize      number
 *   zoom           number                          1.0 = fit, >1 = zoomed in
 *   panX, panY     number                          translation in pixels
 *   vectorGroup    number                          used by search / overlays
 *   currentOperation  string|null                  hint for color picking
 *
 * Optional flags consumed by the export hook + animation orchestrator:
 *   loweredSetBits, loweredSetBits3D, depthStrength, depthAngle, ...
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  Adding a new visualization mode
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. Create `src/renderers/MyModeRenderer.js` extending VisualizationRenderer.
 * 2. Implement at minimum: attach, init, resize, setState, render,
 *    bitIndexToCanvas, canvasToBitIndex, toDataURL.
 * 3. Decide which optional hooks make sense for the mode (minimap, mask
 *    overlays, depth, etc.) and stub the rest as no-ops so the toolbar
 *    can stay generic.
 * 4. In `Visualizer.jsx`, gate the constructor on a `visualizationMode` prop:
 *
 *      const RendererClass = MODES[visualizationMode] || SieveRenderer;
 *      rendererRef.current = new RendererClass();
 *
 * 5. Reuse pure helpers under `src/renderer/` (drawingHelpers, bitMath,
 *    constants) — they are intentionally framework-free.
 */
export class VisualizationRenderer {
  // ── lifecycle ──────────────────────────────────────────────────────────
  /** @param {HTMLCanvasElement} canvas */
  attach(/* canvas */)            { throw new Error('attach() not implemented'); }
  attachSettledCanvas(/* canvas */) { /* optional */ }
  attachMinimapCanvas(/* canvas */) { /* optional */ }

  /**
   * @param {number} bitCount  total addressable bits in the sieve
   * @param {number} sieveSize the upper bound being sieved
   */
  init(/* bitCount, sieveSize */) { throw new Error('init() not implemented'); }

  /** @param {number} width @param {number} height (CSS pixels) */
  resize(/* width, height */)     { throw new Error('resize() not implemented'); }

  // ── per-frame state ────────────────────────────────────────────────────
  /**
   * Push a new step's data to the renderer. All arguments are optional past
   * the first; renderers must tolerate undefined for the modes they don't
   * support (e.g. mask metadata for non-grid views).
   */
  setState(
    /* bitStateUint8, changedSet, targetSet, targetHitCounts,
       focusRange, maskMeta, options */
  ) { throw new Error('setState() not implemented'); }

  /** Paint the current state to the main canvas. */
  render()                        { throw new Error('render() not implemented'); }

  /** Optional: paint the navigational minimap. */
  renderMinimap(/* w, h, detailH */) { /* optional */ }

  // ── coordinate transforms ──────────────────────────────────────────────
  /** @returns {{ x:number, y:number, w:number, h:number } | null} */
  bitIndexToCanvas(/* idx */) { throw new Error('bitIndexToCanvas() not implemented'); }
  /** @returns {number} bit index, or -1 if outside any cell. */
  canvasToBitIndex(/* x, y */) { throw new Error('canvasToBitIndex() not implemented'); }

  // ── export ─────────────────────────────────────────────────────────────
  /** @returns {string} data URL of the current frame. */
  toDataURL() { return this.canvas?.toDataURL('image/png') || ''; }

  // ── overlays / search (optional) ───────────────────────────────────────
  setSearchHighlight(/* type, index, bitIndex */) { /* optional */ }
  clearSearchHighlight() { /* optional */ }
  buildPrimeOverlay() { /* optional */ }

  // ── heatmap (optional) ─────────────────────────────────────────────────
  updateHeatMap(/* changedBits, stepIndex */) { /* optional */ }
  rebuildHeatMap(/* steps, targetStep */) { /* optional */ }
}
