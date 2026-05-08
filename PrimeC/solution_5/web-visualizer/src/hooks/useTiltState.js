import { useState, useEffect } from 'react';

/**
 * Manages the `isTiltActive` boolean state and `isTiltButtonEnabled` derived flag
 * that were previously inline in Visualizer.jsx.
 *
 * isTiltActive: true once the intro reaches 'tilting' or 'visible'.
 * isTiltButtonEnabled: true while the intro phase is 'tilting' or 'visible'.
 *
 * @param {{ introPhase: string }} params
 * @returns {{ isTiltActive: boolean, setIsTiltActive: function, isTiltButtonEnabled: boolean }}
 */
export function useTiltState({ introPhase }) {
  const [isTiltActive, setIsTiltActive] = useState(false);
  const isTiltButtonEnabled = introPhase === 'tilting' || introPhase === 'visible';

  useEffect(() => {
    if (introPhase === 'tilting' || introPhase === 'visible') {
      setIsTiltActive(true);
    } else {
      setIsTiltActive(false);
    }
  }, [introPhase]);

  return { isTiltActive, setIsTiltActive, isTiltButtonEnabled };
}
