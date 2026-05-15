import { useEffect } from 'react';

export function useCameraStartupRefit({
  camera3DRef,
  cameraKey,
  setCamera3DContainerStyle,
  setCamera3DTransform,
  schedulePostLayoutRefresh,
  refitViewportToContent,
}) {
  useEffect(() => {
    const cam = camera3DRef.current;
    if (!cam) return;

    cam.perspective = 1500;
    cam.enable();
    setCamera3DContainerStyle(cam.getContainerStyle());
    setCamera3DTransform(cam.getCanvasTransform());
    schedulePostLayoutRefresh(null);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refitViewportToContent({ instant: true });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraKey]);
}