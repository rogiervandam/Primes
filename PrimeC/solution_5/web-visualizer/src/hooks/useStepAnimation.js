/**
 * useStepAnimation — owns per-event animation runtime state.
 *
 * Owns:
 *  - bitAnimationMode ('bit' | 'mask' | 'combined') + ref
 *  - isSingleEventLoopActive + ref
 *  - isAutoAnimateOnSelect + ref
 *  - isAnimationReplayPaused
 *  - isScrubbingTopRef
 *  - stepScrubProgress + accessor refs
 *  - delayPhaseMs + setDelayPhaseMsRef
 *  - isStepAnimRunning + setIsStepAnimRunningRef + isStepAnimRunningRefForScheduler
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

  const [isSingleEventLoopActive, setIsSingleEventLoopActive] = useState(false);
  const isSingleEventLoopActiveRef = useRef(false);
  isSingleEventLoopActiveRef.current = isSingleEventLoopActive;

  const [isSingleEventRepeatEnabled, setIsSingleEventRepeatEnabled] = useState(initialPrefs.isSingleEventRepeatEnabled !== false);
  const isSingleEventRepeatEnabledRef = useRef(initialPrefs.isSingleEventRepeatEnabled !== false);
  isSingleEventRepeatEnabledRef.current = isSingleEventRepeatEnabled;

  const [isAutoAnimateOnSelect, setIsAutoAnimateOnSelect] = useState(initialPrefs.isAutoAnimateOnSelect);
  const isAutoAnimateOnSelectRef = useRef(initialPrefs.isAutoAnimateOnSelect);
  isAutoAnimateOnSelectRef.current = isAutoAnimateOnSelect;

  const [isAnimationReplayPaused, setIsAnimationReplayPaused] = useState(false);

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

  const [isStepAnimRunning, setIsStepAnimRunning] = useState(false);
  const setIsStepAnimRunningRef = useRef(setIsStepAnimRunning);
  setIsStepAnimRunningRef.current = setIsStepAnimRunning;
  const isStepAnimRunningRefForScheduler = useRef(false);
  isStepAnimRunningRefForScheduler.current = isStepAnimRunning;

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
    isSingleEventLoopActive, setIsSingleEventLoopActive, isSingleEventLoopActiveRef,
    isSingleEventRepeatEnabled, setIsSingleEventRepeatEnabled, isSingleEventRepeatEnabledRef,
    isAutoAnimateOnSelect, setIsAutoAnimateOnSelect, isAutoAnimateOnSelectRef,
    isAnimationReplayPaused, setIsAnimationReplayPaused,
    isScrubbingTopRef,
    stepScrubProgress, setStepScrubProgress, stepScrubProgressRef, stepScrubProgressValueRef,
    delayPhaseMs, setDelayPhaseMsRef,
    isStepAnimRunning, setIsStepAnimRunningRef, isStepAnimRunningRefForScheduler,
    stepResumeStartIndexRef, stepResumeMaskProgressRef,
    currentAnimIntervalRef, currentMaskAnimIntervalRef,
    pausedStepAnimLoopRef, selectedAnimLoopRef,
    handleBitAnimationModeChange,
  };
}
