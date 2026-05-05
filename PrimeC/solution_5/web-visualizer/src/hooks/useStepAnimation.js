/**
 * useStepAnimation — owns per-event animation runtime state.
 *
 * Owns:
 *  - bitAnimationMode ('bit' | 'mask' | 'combined') + ref
 *  - singleEventLoopActive + ref
 *  - autoAnimateOnSelect + ref
 *  - animationReplayPaused
 *  - isScrubbingTopRef
 *  - stepScrubProgress + accessor refs
 *  - delayPhaseMs + setDelayPhaseMsRef
 *  - stepAnimRunning + setStepAnimRunningRef + stepAnimRunningRefForScheduler
 *  - stepResumeStartIndexRef / stepResumeMaskProgressRef
 *  - currentAnimIntervalRef / currentMaskAnimIntervalRef
 *  - pausedStepAnimLoopRef / selectedAnimLoopRef
 *  - handleBitAnimationModeChange callback
 *
 * @param {{ initialPrefs: object }} params
 */
import { useState, useRef, useCallback } from 'react';

export function useStepAnimation({ initialPrefs }) {
  const [bitAnimationMode, setBitAnimationMode] = useState('bit');
  const bitAnimationModeRef = useRef('bit');
  bitAnimationModeRef.current = bitAnimationMode;

  const [singleEventLoopActive, setSingleEventLoopActive] = useState(false);
  const singleEventLoopActiveRef = useRef(false);
  singleEventLoopActiveRef.current = singleEventLoopActive;

  const [autoAnimateOnSelect, setAutoAnimateOnSelect] = useState(initialPrefs.autoAnimateOnSelect);
  const autoAnimateOnSelectRef = useRef(initialPrefs.autoAnimateOnSelect);
  autoAnimateOnSelectRef.current = autoAnimateOnSelect;

  const [animationReplayPaused, setAnimationReplayPaused] = useState(false);

  // True while the user is mid-drag on the top-bar all-events scrubber.
  const isScrubbingTopRef = useRef(false);

  const [stepScrubProgress, setStepScrubProgress] = useState(0);
  const stepScrubProgressRef = useRef(setStepScrubProgress);
  stepScrubProgressRef.current = setStepScrubProgress;
  const stepScrubProgressValueRef = useRef(0);
  stepScrubProgressValueRef.current = stepScrubProgress;

  const [delayPhaseMs, setDelayPhaseMs] = useState(null);
  const setDelayPhaseMsRef = useRef(setDelayPhaseMs);
  setDelayPhaseMsRef.current = setDelayPhaseMs;

  const [stepAnimRunning, setStepAnimRunning] = useState(false);
  const setStepAnimRunningRef = useRef(setStepAnimRunning);
  setStepAnimRunningRef.current = setStepAnimRunning;
  const stepAnimRunningRefForScheduler = useRef(false);
  stepAnimRunningRefForScheduler.current = stepAnimRunning;

  // Resume hints: bit-index / progress fraction for resuming a paused animation.
  const stepResumeStartIndexRef = useRef(0);
  const stepResumeMaskProgressRef = useRef(0);

  // Current live animation interval values (ms). Updated while a loop is running.
  const currentAnimIntervalRef = useRef(20);
  const currentMaskAnimIntervalRef = useRef(20);

  // Refs for the active loop callbacks — set/cleared by usePlaybackLoop.
  const pausedStepAnimLoopRef = useRef(null);
  const selectedAnimLoopRef = useRef(null);

  // Simple mode toggle (no seek side-effect needed from settings panel).
  const handleBitAnimationModeChange = useCallback((mode) => {
    setBitAnimationMode(mode);
    bitAnimationModeRef.current = mode;
  }, []);

  return {
    bitAnimationMode, setBitAnimationMode, bitAnimationModeRef,
    singleEventLoopActive, setSingleEventLoopActive, singleEventLoopActiveRef,
    autoAnimateOnSelect, setAutoAnimateOnSelect, autoAnimateOnSelectRef,
    animationReplayPaused, setAnimationReplayPaused,
    isScrubbingTopRef,
    stepScrubProgress, setStepScrubProgress, stepScrubProgressRef, stepScrubProgressValueRef,
    delayPhaseMs, setDelayPhaseMsRef,
    stepAnimRunning, setStepAnimRunningRef, stepAnimRunningRefForScheduler,
    stepResumeStartIndexRef, stepResumeMaskProgressRef,
    currentAnimIntervalRef, currentMaskAnimIntervalRef,
    pausedStepAnimLoopRef, selectedAnimLoopRef,
    handleBitAnimationModeChange,
  };
}
