/**
 * use3DCamera — owns the lifecycle and reactive state of the Camera3D
 * gesture/transform helper.
 *
 * What this hook handles:
 *   - the persistent `camera3DRef` (the Camera3D instance, if any).
 *   - the two pieces of derived state the parent uses to style the canvas
 *     stack: `camera3DContainerStyle` and `camera3DTransform`.
 *   - `createCamera({ onPanZoom })` — call this inside whichever effect
 *     also constructs the renderer; it instantiates the camera, wires its
 *     update callback to keep the React state in sync, and forwards
 *     pan/zoom updates to the supplied callback (parent owns the
 *     renderer/setZoom side effects).
 *   - `disposeCamera()` — call from that same effect's cleanup.
 *   - `ensureTiltCamera()` — enables 3D mode lazily (used by mouse and
 *     keyboard handlers when a tilt-style gesture starts).
 *
 * What this hook does NOT handle:
 *   - the pointer/wheel/touch handler that drives pan/zoom/rotation. That
 *     lives in the giant gesture useEffect in Visualizer.jsx because the
 *     2D pan/zoom and 3D rotation paths share the same pointer state
 *     machine. See docs/AI_MAINTENANCE.md §7 for the deferred work to
 *     split it further.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera3D } from '../../renderer/Camera3D.js';

function sameContainerStyle(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.perspective === b.perspective && a.perspectiveOrigin === b.perspectiveOrigin;
}

export function use3DCamera() {
  const camera3DRef = useRef(null);
  const [camera3DTransform, setCamera3DTransform] = useState('none');
  const [camera3DContainerStyle, setCamera3DContainerStyle] = useState({});
  // Incremented each time createCamera() is called so that React effects
  // that depend on the camera instance can re-fire after a StrictMode
  // double-mount (where the renderer effect re-creates the camera but
  // ref-only consumers would otherwise see the new instance too late).
  const [cameraKey, setCameraKey] = useState(0);

  // ── Imperative DOM-listener path ────────────────────────────────────────
  // Per-frame camera updates (rotation drag, animateTo tick) used to push
  // through React state, forcing a re-render of the entire visualizer tree
  // every animation frame. With the events panel open the tree is large
  // enough that React's reconciliation work alone caused noticeable FPS
  // drops, even though EventsPanel itself is React.memo'd and skipped.
  //
  // The DOM listeners registered here are invoked synchronously on every
  // camera change, before React state is touched. Consumers that only need
  // to push the new transform into the DOM (e.g. useCanvasLayout's GL/glyph
  // canvas transform sync) can register here and skip React entirely. React
  // state sync is coalesced to one update per RAF so consumers that need it
  // (DebugToolsPanel, snapshot serialization) still see updates, but the
  // visual rotation is no longer gated on React's render pass.
  const domListenersRef = useRef(new Set());
  const addCameraDomListener = useCallback((fn) => {
    domListenersRef.current.add(fn);
    // Fire once on subscribe so the listener can apply the current state.
    if (camera3DRef.current) {
      try { fn(camera3DRef.current); } catch (_) { /* ignore */ }
    }
    return () => domListenersRef.current.delete(fn);
  }, []);

  // ── React state sync strategy ──────────────────────────────────────────
  // The DOM listeners above already keep the canvas elements visually in
  // sync every tick. React state (camera3DTransform / camera3DContainerStyle)
  // is consumed by the safety-net effect, debug panel, snapshot
  // serialization and the perspective inline style on .canvas-container.
  //
  //  • container style (perspective) — must update promptly because it
  //    drives an inline React style. Coalesced to one per RAF.
  //  • canvas transform string — already applied via DOM listeners, so
  //    React state only needs to catch up when the camera goes IDLE
  //    (end of drag / animation). Doing it every frame caused Visualizer
  //    to re-render at 60Hz during rotation, which with the events panel
  //    open made playback / rotation visibly stutter even though the
  //    canvases themselves were drawing fine.
  const pendingContainerSyncRafRef = useRef(0);
  const transformIdleTimeoutRef = useRef(0);
  const TRANSFORM_IDLE_MS = 120;
  const scheduleStateSync = useCallback(() => {
    // Container style: per-RAF throttle.
    if (!pendingContainerSyncRafRef.current) {
      pendingContainerSyncRafRef.current = requestAnimationFrame(() => {
        pendingContainerSyncRafRef.current = 0;
        const cam = camera3DRef.current;
        if (!cam) return;
        const nextContainerStyle = cam.getContainerStyle();
        setCamera3DContainerStyle((prev) => (
          sameContainerStyle(prev, nextContainerStyle) ? prev : nextContainerStyle
        ));
      });
    }
    // Canvas transform: defer to idle. Each tick resets the timer; the
    // setState only fires once the camera has been quiet for ~120ms.
    if (transformIdleTimeoutRef.current) {
      clearTimeout(transformIdleTimeoutRef.current);
    }
    transformIdleTimeoutRef.current = setTimeout(() => {
      transformIdleTimeoutRef.current = 0;
      const cam = camera3DRef.current;
      if (!cam) return;
      const nextTransform = cam.getCanvasTransform();
      setCamera3DTransform((prev) => (prev === nextTransform ? prev : nextTransform));
    }, TRANSFORM_IDLE_MS);
  }, []);

  const createCamera = useCallback(({ onPanZoom }) => {
    const cam = new Camera3D();
    camera3DRef.current = cam;
    cam.setUpdateCallback(() => {
      // Fire DOM listeners synchronously — these mutate canvas .style.transform
      // directly so the visual rotation tracks the pointer with zero React
      // overhead. Coalesce the React state sync to RAF.
      const listeners = domListenersRef.current;
      if (listeners.size > 0) {
        for (const fn of listeners) {
          try { fn(cam); } catch (_) { /* ignore listener errors */ }
        }
      }
      scheduleStateSync();
    });
    cam.setPanZoomCallback(onPanZoom);
    setCameraKey(k => k + 1);
    return cam;
  }, [scheduleStateSync]);

  const disposeCamera = useCallback(() => {
    if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
    camera3DRef.current = null;
  }, []);

  const ensureTiltCamera = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam) return null;
    if (!cam.enabled) {
      cam.rotateX = Math.max(10, cam.rotateX || 14);
      cam.rotateY = cam.rotateY || 0;
      cam.perspective = 1500;
      cam.enable();
      setCamera3DContainerStyle(cam.getContainerStyle());
      setCamera3DTransform(cam.getCanvasTransform());
    }
    return cam;
  }, []);

  useEffect(() => {
    return () => {
      if (pendingContainerSyncRafRef.current) {
        cancelAnimationFrame(pendingContainerSyncRafRef.current);
        pendingContainerSyncRafRef.current = 0;
      }
      if (transformIdleTimeoutRef.current) {
        clearTimeout(transformIdleTimeoutRef.current);
        transformIdleTimeoutRef.current = 0;
      }
    };
  }, []);

  return {
    camera3DRef,
    camera3DTransform,
    camera3DContainerStyle,
    cameraKey,
    setCamera3DTransform,
    setCamera3DContainerStyle,
    createCamera,
    disposeCamera,
    ensureTiltCamera,
    addCameraDomListener,
  };
}
