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
import { useCallback, useRef, useState } from 'react';
import { Camera3D } from '../Camera3D';

export function use3DCamera({ mode3D }) {
  const camera3DRef = useRef(null);
  const [camera3DTransform, setCamera3DTransform] = useState('none');
  const [camera3DContainerStyle, setCamera3DContainerStyle] = useState({});
  // Incremented each time createCamera() is called so that React effects
  // that depend on the camera instance can re-fire after a StrictMode
  // double-mount (where the renderer effect re-creates the camera but
  // ref-only consumers would otherwise see the new instance too late).
  const [cameraKey, setCameraKey] = useState(0);

  const createCamera = useCallback(({ onPanZoom }) => {
    const cam = new Camera3D();
    camera3DRef.current = cam;
    cam.setUpdateCallback(() => {
      setCamera3DTransform(cam.getCanvasTransform());
      setCamera3DContainerStyle(cam.getContainerStyle());
    });
    cam.setPanZoomCallback(onPanZoom);
    setCameraKey(k => k + 1);
    return cam;
  }, []);

  const disposeCamera = useCallback(() => {
    if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
    camera3DRef.current = null;
  }, []);

  const ensureTiltCamera = useCallback(() => {
    const cam = camera3DRef.current;
    if (!cam) return null;
    if (!cam.enabled) {
      cam.enable();
      if (!mode3D) {
        cam.rotateX = Math.max(10, cam.rotateX || 14);
        cam.rotateY = cam.rotateY || 0;
        cam.perspective = 1500;
        setCamera3DContainerStyle(cam.getContainerStyle());
        setCamera3DTransform(cam.getCanvasTransform());
      }
    }
    return cam;
  }, [mode3D]);

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
  };
}
