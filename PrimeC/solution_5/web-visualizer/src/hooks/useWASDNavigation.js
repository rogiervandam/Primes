/**
 * useWASDNavigation — WASD/QRF game-like fly-through controls. (item 237)
 *
 * item 243: Only active when fly mode is on (flyModeActiveRef.current === true).
 * Toggle fly mode with the F key (handled in useKeyboardShortcuts).
 *
 * The mouse cursor defines the "forward" direction — the 2D screen-space
 * vector from the canvas centre to the cursor.  Keys then move relative to
 * that direction just like a top-down game:
 *
 *   W   — move toward the mouse cursor (forward)
 *   S   — move away from the mouse cursor (backward)
 *   A   — strafe left  (CW-perpendicular to forward in screen space)
 *   D   — strafe right (CCW-perpendicular to forward in screen space)
 *   Q   — zoom in  (forward in depth)
 *   E   — zoom out (backward in depth)
 *   R   — pan up   (absolute, independent of mouse direction)
 *   C   — pan down (absolute, independent of mouse direction; was F in item 237)
 *
 * When the mouse is within 10 px of the canvas centre (dead-zone) the
 * direction defaults to "up" so there is always a well-defined forward.
 *
 * 3D mode note: pan is applied to renderer.panX/panY regardless of camera
 * tilt; W/S/A/D no longer orbit the camera (use Shift+Arrow for orbit).
 */
import { useEffect, useRef } from 'react';

const WASD_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'c']);

export function useWASDNavigation({
  rendererRef,
  canvasRef,           // optional: WebGL canvas element ref — used for bounding-rect mouse direction
  getMinimapDetailH,
  updateMinimapAvailability,
  scheduleBalloonRelayout,
  flyModeActiveRef,    // item 243: only active when fly mode is on
}) {
  const keysHeld    = useRef(new Set());
  const rafRef      = useRef(null);
  const lastTimeRef = useRef(null);
  const mousePos    = useRef({ x: 0, y: 0 });
  const handlersRef = useRef({});

  handlersRef.current = {
    rendererRef,
    canvasRef,
    getMinimapDetailH,
    updateMinimapAvailability,
    scheduleBalloonRelayout,
    flyModeActiveRef,
  };

  useEffect(() => {
    const runFrame = (now) => {
      const held = keysHeld.current;
      if (held.size === 0) {
        rafRef.current = null;
        lastTimeRef.current = null;
        return;
      }

      const dt = lastTimeRef.current == null
        ? 0
        : Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const { rendererRef: rRef, canvasRef: cRef, getMinimapDetailH: gmh,
        updateMinimapAvailability: uma, scheduleBalloonRelayout: sbr } = handlersRef.current;
      const r = rRef.current;
      if (!r) { rafRef.current = requestAnimationFrame(runFrame); return; }

      const PAN_SPEED  = 600 / (r.zoom || 1);   // viewport-px per second (zoom-invariant)
      const ZOOM_SPEED = Math.log(1.6);           // e-folding ≈ 1 s

      // ── Forward direction: canvas-centre → mouse cursor ──────────────────
      // Default to "up" (0, -1) when mouse is in the dead-zone (<10 px from
      // centre) so W always does something sensible.
      let fx = 0, fy = -1;
      const canvas = cRef?.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dx = mousePos.current.x - (rect.left + rect.width  / 2);
        const dy = mousePos.current.y - (rect.top  + rect.height / 2);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 10) { fx = dx / len; fy = dy / len; }
      }

      // ── Movement deltas ──────────────────────────────────────────────────
      // Screen-space rotation:
      //   CW  of (fx,fy): ( fy, -fx)  → strafe-left  (A)
      //   CCW of (fx,fy): (-fy,  fx)  → strafe-right (D)
      //
      // Pan semantics: panX -= direction.x moves viewport right (sees more to the right).
      let panXDelta = 0;
      let panYDelta = 0;
      let zoomDelta = 0;

      if (held.has('w')) { panXDelta -= fx * PAN_SPEED * dt; panYDelta -= fy * PAN_SPEED * dt; }
      if (held.has('s')) { panXDelta += fx * PAN_SPEED * dt; panYDelta += fy * PAN_SPEED * dt; }
      // A strafe-left  (CW perp):  left = ( fy, -fx)  → pan -= left
      if (held.has('a')) { panXDelta -= fy * PAN_SPEED * dt; panYDelta += fx * PAN_SPEED * dt; }
      // D strafe-right (CCW perp): right = (-fy,  fx) → pan -= right
      if (held.has('d')) { panXDelta += fy * PAN_SPEED * dt; panYDelta -= fx * PAN_SPEED * dt; }
      // R/F: absolute vertical pan (rise / fall), independent of mouse direction
      if (held.has('r')) panYDelta += PAN_SPEED * dt;
      if (held.has('c')) panYDelta -= PAN_SPEED * dt;  // item 243: 'c' for pan down (was 'f')
      // Q/E: zoom
      if (held.has('q')) zoomDelta = +ZOOM_SPEED * dt;
      if (held.has('e')) zoomDelta = -ZOOM_SPEED * dt;

      let needRender = false;

      if (panXDelta !== 0 || panYDelta !== 0) {
        r.panX = (r.panX || 0) + panXDelta;
        r.panY = (r.panY || 0) + panYDelta;
        needRender = true;
      }

      if (zoomDelta !== 0) {
        const factor   = Math.exp(zoomDelta);
        const prevZoom = r.zoom || 1;
        const newZoom  = Math.max(0.05, Math.min(40, prevZoom * factor));
        const cx = (r.canvasWidth  || 0) / 2;
        const cy = (r.canvasHeight || 0) / 2;
        const ratio = newZoom / prevZoom;
        r.panX = cx + (r.panX - cx) * ratio;
        r.panY = cy + (r.panY - cy) * ratio;
        r.zoom = newZoom;
        needRender = true;
      }

      if (needRender) {
        r.render();
        uma();
        r.renderMinimap(r.canvasWidth, r.canvasHeight || 0, gmh());
        sbr();
      }

      rafRef.current = requestAnimationFrame(runFrame);
    };

    const onMouseMove = (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; };

    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // item 243: only process WASD keys when fly mode is active
      if (!handlersRef.current.flyModeActiveRef?.current) return;
      const key = e.key.toLowerCase();
      if (!WASD_KEYS.has(key)) return;
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation(); // prevent WASD from triggering keyboard shortcuts (e.g. D → detail panel)
      keysHeld.current.add(key);
      if (!rafRef.current) {
        lastTimeRef.current = null;
        rafRef.current = requestAnimationFrame(runFrame);
      }
    };

    const onKeyUp  = (e) => { keysHeld.current.delete(e.key.toLowerCase()); };
    const onBlur   = ()  => { keysHeld.current.clear(); };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown',   onKeyDown);
    document.addEventListener('keyup',     onKeyUp);
    window.addEventListener('blur',        onBlur);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('keydown',   onKeyDown);
      document.removeEventListener('keyup',     onKeyUp);
      window.removeEventListener('blur',        onBlur);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      keysHeld.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Registered once; reads current values via handlersRef.
}



