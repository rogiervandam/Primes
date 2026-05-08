/**
 * useKeyboardShortcuts — global keyboard handlers for the Visualizer.
 *
 * Registers a single document-level `keydown` listener while mounted.
 * The listener is a no-op when the user is editing a text field or select.
 *
 * Shortcuts:
 *   Space            play / pause
 *   ←  /  →  /  ↑  /  ↓   previous / next step
 *   Shift+← / Shift+→  (3D mode) orbit camera left / right
 *   Shift+↑ / Shift+↓  (3D mode) orbit camera up / down
 *   Home / End       jump to first / last step
 *   + / =            zoom in
 *   -                zoom out
 *   0                reset zoom
 *   T                toggle theme
 *   D                toggle detail panel
 *   R                (3D mode) reset rotation to flat
 *   `                toggle debug tools panel
 *   ?                open / close keyboard shortcuts help overlay
 *
 * Caller passes the actions; this hook contains no state of its own.
 * The listener is registered once (empty dep array) and reads all
 * current values through a stable ref, so it never tears down and
 * re-registers when step counter, goToStep, or speed changes.
 */
import { useEffect, useRef } from 'react';

export function useKeyboardShortcuts({
  currentStep,
  stepCount,
  goToStep,
  handlePlayPause,
  doZoom,
  resetZoom,
  setTheme,
  toggleDetailPanel,
  toggleDebugToolsPanel,
  camera3DRef,
  toggleShortcutsOverlay,
}) {
  // Always-current snapshot of every value the listener needs.
  // Updated on every render; the listener reads from here so it
  // never needs to be torn down and re-registered.
  const handlersRef = useRef({});
  handlersRef.current = {
    currentStep,
    stepCount,
    goToStep,
    handlePlayPause,
    doZoom,
    resetZoom,
    setTheme,
    toggleDetailPanel,
    toggleDebugToolsPanel,
    camera3DRef,
    toggleShortcutsOverlay,
  };

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const {
        currentStep: cs,
        stepCount: sc,
        goToStep: gts,
        handlePlayPause: hpp,
        doZoom: dz,
        resetZoom: rz,
        setTheme: st,
        toggleDetailPanel: tdp,
        toggleDebugToolsPanel: tdtp,
        camera3DRef: cam3DRef,
        toggleShortcutsOverlay: tso,
      } = handlersRef.current;
      const cam = cam3DRef?.current;
      const is3D = cam && cam.enabled;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('left');
          else gts(cs - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('right');
          else gts(cs + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('up');
          else gts(cs - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (is3D && e.shiftKey) cam.orbit('down');
          else gts(cs + 1);
          break;
        case 'Home':       e.preventDefault(); gts(0); break;
        case 'End':        e.preventDefault(); gts(sc - 1); break;
        case ' ':          e.preventDefault(); hpp(); break;
        case '+': case '=': e.preventDefault(); dz(1.5); break;
        case '-':          e.preventDefault(); dz(1 / 1.5); break;
        case '0':          e.preventDefault(); rz(); break;
        case 't': case 'T': e.preventDefault(); st((t) => (t === 'dark' ? 'light' : 'dark')); break;
        case 'd': case 'D': e.preventDefault(); tdp(); break;
        case 'r': case 'R':
          e.preventDefault();
          if (is3D) cam.resetFlat();
          break;
        case '`':
          e.preventDefault();
          if (tdtp) tdtp();
          break;
        case '?':
          e.preventDefault();
          if (tso) tso();
          break;
        default: break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Listener registered once; reads current values via handlersRef.
}
