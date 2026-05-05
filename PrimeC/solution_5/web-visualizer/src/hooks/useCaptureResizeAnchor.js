import { useCallback } from 'react';

export function useCaptureResizeAnchor({ pendingResizeAnchorRef, captureViewportAnchor }) {
  const captureResizeAnchor = useCallback(() => {
    pendingResizeAnchorRef.current = captureViewportAnchor(0.5, 0.5);
  }, [pendingResizeAnchorRef, captureViewportAnchor]);

  return { captureResizeAnchor };
}