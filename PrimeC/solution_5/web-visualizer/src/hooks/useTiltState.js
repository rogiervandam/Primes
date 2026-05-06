import { useState, useEffect } from 'react';

/**
 * Manages the `tiltActive` boolean state and `tiltButtonEnabled` derived flag
 * that were previously inline in Visualizer.jsx.
 *
 * tiltActive: true once the intro reaches 'tilting' or 'visible'.
 * tiltButtonEnabled: true while the intro phase is 'tilting' or 'visible'.
 *
 * @param {{ introPhase: string }} params
 * @returns {{ tiltActive: boolean, setTiltActive: function, tiltButtonEnabled: boolean }}
 */
export function useTiltState({ introPhase }) {
  const [tiltActive, setTiltActive] = useState(false);
  const tiltButtonEnabled = introPhase === 'tilting' || introPhase === 'visible';

  useEffect(() => {
    if (introPhase === 'tilting' || introPhase === 'visible') {
      setTiltActive(true);
    } else {
      setTiltActive(false);
    }
  }, [introPhase]);

  return { tiltActive, setTiltActive, tiltButtonEnabled };
}
