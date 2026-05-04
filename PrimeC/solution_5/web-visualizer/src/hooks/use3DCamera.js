/**
 * use3DCamera — owns the lifecycle of the Camera3D pan/zoom helper.
 *
 * What this hook handles:
 *   - the persistent `camera3DRef` (the Camera3D instance, if any).
 *   - `createCamera({ onPanZoom })` — call this inside whichever effect
 *     also constructs the renderer; it instantiates the camera and wires
 *     pan/zoom updates to the supplied callback.
 *   - `disposeCamera()` — call from that same effect's cleanup.
 *
 * CSS 3D transforms (rotateX/Y, perspective) are no longer produced here.
 * The camera is only used for pan/zoom gesture coordination.
 */
import { useCallback, useRef } from 'react';
import { Camera3D } from '../Camera3D';

export function use3DCamera() {
  const camera3DRef = useRef(null);

  const createCamera = useCallback(({ onPanZoom }) => {
    const cam = new Camera3D();
    camera3DRef.current = cam;
    cam.setPanZoomCallback(onPanZoom);
    return cam;
  }, []);

  const disposeCamera = useCallback(() => {
    if (camera3DRef.current) camera3DRef.current.cancelAllAnimations();
    camera3DRef.current = null;
  }, []);

  return {
    camera3DRef,
    createCamera,
    disposeCamera,
  };
}
