/**
 * useAnimationConfig — owns animation-settings state and derived speed values.
 *
 * Owns:
 *  - animMode ('sequential' | 'bounce' | 'all')
 *  - animStyle ('ripple' | 'fade' | 'pulse' | 'none')
 *  - delayBetweenEvents / delayBetweenRepeats + delayBetweenRepeatsRef
 *  - eventTimeTargets + eventTimeTargetsRef
 *  - eventDurationMode + eventDurationModeRef
 *  - bitAnimInterval / maskAnimInterval
 *  - forward refs: bitsAtTimeRatioRef, timeRatioAtBitIndexRef, computeEventDurationRef
 *  - derived: cycleAnimStyle, cycleAnimMode, animStyleInfo, animModeInfo
 *  - derived: stepSpeedValue, maskSpeedValue, setStepSpeedValue, setMaskSpeedValue
 *
 * @param {{ initialPrefs: object }} params
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { clampMs as clampMsPure } from '../lib/animationTiming';

export function useAnimationConfig({ initialPrefs }) {
  const [animMode, setAnimMode] = useState('sequential');
  const [animStyle, setAnimStyle] = useState('fade');

  const [delayBetweenEvents, setDelayBetweenEvents] = useState(initialPrefs.delayBetweenEvents);
  const delayBetweenEventsRef = useRef(delayBetweenEvents);
  delayBetweenEventsRef.current = delayBetweenEvents;
  const [delayBetweenRepeats, setDelayBetweenRepeats] = useState(initialPrefs.delayBetweenRepeats);
  const delayBetweenRepeatsRef = useRef(delayBetweenRepeats);
  delayBetweenRepeatsRef.current = delayBetweenRepeats;

  const [eventTimeTargets, setEventTimeTargets] = useState(initialPrefs.eventTimeTargets);
  const eventTimeTargetsRef = useRef(eventTimeTargets);
  eventTimeTargetsRef.current = eventTimeTargets;

  const [eventDurationMode, setEventDurationMode] = useState(initialPrefs.eventDurationMode);
  const eventDurationModeRef = useRef(eventDurationMode);
  eventDurationModeRef.current = eventDurationMode;

  const [bitAnimInterval, setBitAnimInterval] = useState(20);
  const [maskAnimInterval, setMaskAnimInterval] = useState(() => {
    const stepIntervalDefault = 20;
    const stepSpeedValueDefault = Math.round(1 + ((5000 - stepIntervalDefault) / (5000 - 5)) * 499);
    const maskSpeedValueDefault = Math.max(1, Math.round(stepSpeedValueDefault * 0.2));
    const ratio = (maskSpeedValueDefault - 1) / 499;
    return Math.round(5000 - ratio * (5000 - 5));
  });

  // Forward refs so functions defined earlier in the file can use the
  // bits<->time helpers (defined further down in Visualizer.jsx).
  const bitsAtTimeRatioRef = useRef(null);
  const timeRatioAtBitIndexRef = useRef(null);
  const computeEventDurationRef = useRef(null);

  // --- Derived speed helpers ---

  const stepSpeedValue = useMemo(() => {
    const interval = clampMsPure(parseInt(bitAnimInterval || 0, 10) || 20, 5, 5000);
    const ratio = (5000 - interval) / (5000 - 5);
    return Math.round(1 + ratio * 499);
  }, [bitAnimInterval]);

  const maskSpeedValue = useMemo(() => {
    const interval = clampMsPure(parseInt(maskAnimInterval || 0, 10) || 20, 5, 5000);
    const ratio = (5000 - interval) / (5000 - 5);
    return Math.round(1 + ratio * 499);
  }, [maskAnimInterval]);

  const setStepSpeedValue = useCallback((speedValue) => {
    const speed = clampMsPure(parseInt(speedValue || 0, 10) || 1, 1, 500);
    const ratio = (speed - 1) / 499;
    setBitAnimInterval(Math.round(5000 - ratio * (5000 - 5)));
  }, []);

  const setMaskSpeedValue = useCallback((speedValue) => {
    const speed = clampMsPure(parseInt(speedValue || 0, 10) || 1, 1, 500);
    const ratio = (speed - 1) / 499;
    setMaskAnimInterval(Math.round(5000 - ratio * (5000 - 5)));
  }, []);

  const cycleAnimStyle = useCallback(() => {
    const styles = ['ripple', 'fade', 'pulse', 'none'];
    setAnimStyle((prev) => {
      const current = styles.indexOf(prev);
      return styles[(current + 1 + styles.length) % styles.length];
    });
  }, []);

  const cycleAnimMode = useCallback(() => {
    const modes = ['sequential', 'bounce', 'all'];
    setAnimMode((prev) => {
      const current = modes.indexOf(prev);
      return modes[(current + 1 + modes.length) % modes.length];
    });
  }, []);

  const animStyleInfo = useMemo(() => ({
    ripple: { label: 'Ripple', shortLabel: 'Rip', hint: 'Water-drop ripple on changed bits', swatch: '◌' },
    fade: { label: 'Fade', shortLabel: 'Fade', hint: 'Soft fade highlight', swatch: '◔' },
    pulse: { label: 'Pulse', shortLabel: 'Pulse', hint: 'Pulse changed bits', swatch: '◎' },
    none: { label: 'None', shortLabel: 'Off', hint: 'No animated effect', swatch: '—' },
  }), []);

  const animModeInfo = useMemo(() => ({
    sequential: { label: 'Sequential', hint: 'Animate bit-by-bit in order', swatch: '1→2→3' },
    bounce: { label: 'Bounce', hint: 'Animate forward and backward', swatch: '↔' },
    all: { label: 'All At Once', hint: 'Animate all bits simultaneously', swatch: '⋯' },
  }), []);

  // item 244: "changed" = only animate bits that actually changed (default)
  //           "targeted" = animate all bits targeted by the event (already-set shown in amber)
  const [animateBitsMode, setAnimateBitsMode] = useState('changed');
  const animateBitsModeRef = useRef('changed');
  animateBitsModeRef.current = animateBitsMode;

  return {
    animMode, setAnimMode,
    animStyle, setAnimStyle,
    delayBetweenEvents, setDelayBetweenEvents, delayBetweenEventsRef,
    delayBetweenRepeats, setDelayBetweenRepeats, delayBetweenRepeatsRef,
    eventTimeTargets, setEventTimeTargets, eventTimeTargetsRef,
    eventDurationMode, setEventDurationMode, eventDurationModeRef,
    bitAnimInterval, setBitAnimInterval,
    maskAnimInterval, setMaskAnimInterval,
    bitsAtTimeRatioRef, timeRatioAtBitIndexRef, computeEventDurationRef,
    stepSpeedValue, maskSpeedValue, setStepSpeedValue, setMaskSpeedValue,
    cycleAnimStyle, cycleAnimMode,
    animStyleInfo, animModeInfo,
    animateBitsMode, setAnimateBitsMode, animateBitsModeRef,  // item 244
  };
}
