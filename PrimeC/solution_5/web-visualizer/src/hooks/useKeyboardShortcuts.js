/**
 * useKeyboardShortcuts — global keyboard handlers for the Visualizer.
 *
 * Registers a single document-level `keydown` listener while mounted.
 * The listener is a no-op when the user is editing a text field or select.
 *
 * Shortcuts:
 *   Space            play / pause
 *   ←  /  →          previous / next step
 *   Shift+← / Shift+→  (3D mode) orbit camera left / right
 *   ↑  /  ↓          (3D mode) orbit camera up / down
 *   Home / End       jump to first / last step
 *   + / =            zoom in
 *   -                zoom out
 *   0                reset zoom
 *   T                toggle theme
 *   D                toggle detail panel
 *   R                (3D mode) reset rotation to flat
 *
 * Caller passes the actions; this hook contains no state of its own. It
 * intentionally avoids stale-closure issues by re-binding the listener
 * whenever any of its inputs change.
 */
import { useEffect } from 'react';

export function useKeyboardShortcuts({
  currentStep,
  stepCount,
  goToStep,
  handlePlayPause,
  doZoom,
  resetZoom,
  setTheme,
  toggleDetailPanel,
  camera3DRef,
}) {
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const cam = camera3DRef?.current;
      const is3D = cam && cam.enabled;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('left');
          else goToStep(currentStep - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('right');
          else goToStep(currentStep + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (is3D) cam.orbit('up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (is3D) cam.orbit('down');
          break;
        case 'Home':       e.preventDefault(); goToStep(0); break;
        case 'End':        e.preventDefault(); goToStep(stepCount - 1); break;
        case ' ':          e.preventDefault(); handlePlayPause(); break;
        case '+': case '=': e.preventDefault(); doZoom(1.5); break;
        case '-':          e.preventDefault(); doZoom(1 / 1.5); break;
        case '0':          e.preventDefault(); resetZoom(); break;
        case 't': case 'T': e.preventDefault(); setTheme((t) => (t === 'dark' ? 'light' : 'dark')); break;
        case 'd': case 'D': e.preventDefault(); toggleDetailPanel(); break;
        case 'r': case 'R':
          e.preventDefault();
          if (is3D) cam.resetFlat();
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [
    currentStep,
    stepCount,
    goToStep,
    handlePlayPause,
    doZoom,
    resetZoom,
    setTheme,
    toggleDetailPanel,
    camera3DRef,
  ]);
}
