/**
 * usePlaybackLoop — encapsulates the three independent playback-loop effects
 * that co-ordinate animation across Visualizer.jsx.
 *
 * **Three effects managed here:**
 *
 * 1. **Selected-steps loop** — replays the merged changedBits of the
 *    multi-selected events in a tight async loop until the selection
 *    changes or playback starts.
 *
 * 2. **Single-event replay loop** — fires while the single-event widget is in
 *    Play mode (`isSingleEventLoopActive`) or while the user is mid-drag on the
 *    top-bar scrubber (`isScrubbingTopRef`). Repeats the current step's
 *    animation with the configured between-repeat delay.
 *
 * 3. **All-events play/pause scheduler** — drives trace-level event-by-event
 *    playback when `playing` is true. Polls `animBusyUntilRef` to wait for
 *    in-flight per-event animations before advancing to the next step. Also
 *    clears the selected-steps loop timer when play starts so both loops
 *    can't run simultaneously.
 *
 * All three effects read mutable runtime state exclusively through stable refs
 * passed in from the host (Visualizer.jsx). The `playing`, `steps`, …
 * parameters are only used in effect dependency arrays; the bodies read the
 * ref-stable equivalents.
 *
 * @param {object} opts
 *
 * Ref inputs (all stable for the component lifetime):
 * @param {React.MutableRefObject} opts.seekGenRef
 * @param {React.MutableRefObject} opts.globalPausedRef
 * @param {React.MutableRefObject} opts.animBusyUntilRef
 * @param {React.MutableRefObject} opts.triggerAnimationRef
 * @param {React.MutableRefObject} opts.goToStepRef
 * @param {React.MutableRefObject} opts.rendererRef
 * @param {React.MutableRefObject} opts.selectedAnimLoopRef
 * @param {React.MutableRefObject} opts.pausedStepAnimLoopRef
 * @param {React.MutableRefObject} opts.playTimeoutRef
 * @param {React.MutableRefObject} opts.playTimerRef
 * @param {React.MutableRefObject} opts.isScrubbingTopRef
 * @param {React.MutableRefObject} opts.initialHighlightHoldRef
 * @param {React.MutableRefObject} opts.stepResumeStartIndexRef
 * @param {React.MutableRefObject} opts.stepResumeMaskProgressRef
 * @param {React.MutableRefObject} opts.setIsStepAnimRunningRef
 * @param {React.MutableRefObject} opts.isStepAnimRunningRefForScheduler
 *
 * State values (used in effect dep arrays only):
 * @param {boolean}     opts.playing
 * @param {Array}       opts.steps
 * @param {number}      opts.currentStep
 * @param {Set<number>} opts.selectedSteps
 * @param {boolean}     opts.isAnimationReplayPaused
 * @param {React.MutableRefObject} [opts.isAutoAnimateOnSelectRef] - When false, skip the auto-repeat loop
 * @param {boolean}     [opts.isAutoAnimateOnSelect] - State mirror for dep array
 *
 * State setters (stable across renders):
 * @param {function} opts.setPlaying
 * @param {function} opts.setCurrentStep
 */
import { useEffect } from 'react';

export function usePlaybackLoop({ ...flatArgs }) {
  const loopRefs = flatArgs.loopRefs || flatArgs;
  const loopState = flatArgs.loopState || flatArgs;
  const loopHandlers = flatArgs.loopHandlers || flatArgs;
  const loopConfig = flatArgs.loopConfig || flatArgs;

  const {
    seekGenRef,
    globalPausedRef,
    animBusyUntilRef,
    triggerAnimationRef,
    goToStepRef,
    rendererRef,
    selectedAnimLoopRef,
    pausedStepAnimLoopRef,
    playTimeoutRef,
    playTimerRef,
    isScrubbingTopRef,
    initialHighlightHoldRef,
    delayBetweenEventsRef,   // item 217: auto-advance delay when repeat is disabled
    stepResumeStartIndexRef,
    stepResumeMaskProgressRef,
    setIsStepAnimRunningRef,
    isStepAnimRunningRefForScheduler,
    isAutoAnimateOnSelectRef,
  } = loopRefs;

  const {
    playing,
    steps,
    currentStep,
    selectedSteps,
    isAnimationReplayPaused,
  } = loopState;

  const {
    setPlaying,
    setCurrentStep,
  } = loopHandlers;

  const {
    isAutoAnimateOnSelect = true,
  } = loopConfig;

  // ── Effect 1: Repeat selected-step animation until selection changes ─────
  useEffect(() => {
    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }
    if (playing || isAnimationReplayPaused || selectedSteps.size === 0) return;
    // When auto-animate-on-select is disabled, do not start the replay loop.
    if (isAutoAnimateOnSelectRef && isAutoAnimateOnSelectRef.current === false) return;

    const merged = new Set();
    for (const idx of selectedSteps) {
      const s = steps[idx];
      if (!s) continue;
      for (let j = 0; j < s.changedBits.length; j++) merged.add(s.changedBits[j]);
    }
    if (merged.size === 0) return;

    let cancelled = false;
    const loop = async () => {
      const triggerFn = triggerAnimationRef.current;
      if (!triggerFn) return;
      await triggerFn(merged, { adaptiveDuration: true });
      if (cancelled || playing || isAnimationReplayPaused || selectedSteps.size === 0) return;
      // Note: seekGenRef is intentionally NOT checked here. seekStepAnimation sets
      // cancelled=true via effect cleanup; that path is handled above. A seekGenRef
      // bump from the [animMode,animStyle] effect means the user changed animation
      // style — in that case we WANT the loop to restart (not exit).
      selectedAnimLoopRef.current = setTimeout(loop, 0);
    };

    selectedAnimLoopRef.current = setTimeout(loop, 0);

    return () => {
      cancelled = true;
      if (selectedAnimLoopRef.current) {
        clearTimeout(selectedAnimLoopRef.current);
        selectedAnimLoopRef.current = null;
      }
    };
    // triggerAnimation intentionally omitted; see pausedStepAnimLoop for rationale.
    // isAutoAnimateOnSelect is included so the loop tears down immediately when the toggle is switched off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteps, steps, playing, isAnimationReplayPaused, isAutoAnimateOnSelect]);

  // ── Effect 2: While mid-drag on the top-bar scrubber, keep triggering the animation ──
  useEffect(() => {
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }

    // Only run while the user is mid-drag on the top-bar scrubber.
    if (playing || isAnimationReplayPaused || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
    if (!isScrubbingTopRef.current) return;
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;

    const changed = new Set(step.changedBits);
    let cancelled = false;

    const loop = async () => {
      const useStartIndex = stepResumeStartIndexRef.current || 0;
      const useStartProgress = stepResumeMaskProgressRef.current || 0;
      stepResumeStartIndexRef.current = 0;
      stepResumeMaskProgressRef.current = 0;
      const triggerFn = triggerAnimationRef.current;
      if (!triggerFn) return;
      await triggerFn(changed, {
        adaptiveDuration: true,
        delayMs: 0,
        startIndex: useStartIndex,
        startProgress: useStartProgress,
      });
      if (cancelled || playing || isAnimationReplayPaused || selectedSteps.size > 0) return;
      if (!isScrubbingTopRef.current) return;
      pausedStepAnimLoopRef.current = setTimeout(loop, 0);
    };

    pausedStepAnimLoopRef.current = setTimeout(loop, 0);

    return () => {
      cancelled = true;
      if (pausedStepAnimLoopRef.current) {
        clearTimeout(pausedStepAnimLoopRef.current);
        pausedStepAnimLoopRef.current = null;
      }
    };
    // triggerAnimation intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selectedSteps, steps, currentStep, isAnimationReplayPaused]);

  // ── Effect 3: All-events play/pause scheduler ────────────────────────────
  //
  // Drives event-by-event playback when `playing` is true. Polls
  // `animBusyUntilRef` + `globalPausedRef` so the per-event animation can
  // finish before the next step is loaded. `goToStep` is read through the
  // stable `goToStepRef` so this effect never rebuilds during playback.
  useEffect(() => {
    if (!playing) {
      clearInterval(playTimerRef.current);
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      return;
    }

    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }

    const scheduleNext = () => {
      if (!playing || !rendererRef.current) return;

      // While globally paused, freeze the trace-level scheduler too so the
      // toolbar Pause halts the cross-event walk in addition to the
      // in-flight animation.
      if (globalPausedRef.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 32);
        return;
      }

      if (performance.now() < animBusyUntilRef.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 16);
        return;
      }

      // If a per-event animation is still running (e.g. resumed from a
      // pause-in-flight whose wall-clock budget already expired), wait for it
      // to finish before advancing to the next event.
      if (setIsStepAnimRunningRef.current && isStepAnimRunningRefForScheduler.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 32);
        return;
      }

      setCurrentStep((prev) => {
        // item 240: if the current step has no animation content, add a delay before
        // advancing, and show "NO CHANGES" UI.
        const curStep = steps[prev];
        const hasNoAnimation = !curStep || (
          !(curStep.changedBits?.length > 0) &&
          !(curStep.maskWriteOrderWords?.length > 0)
        );
        if (hasNoAnimation) {
          const emptyDelay = delayBetweenEventsRef?.current ?? 0;
          // Block the scheduler for the duration of the delay using animBusyUntilRef.
          animBusyUntilRef.current = performance.now() + Math.max(emptyDelay, 1);
          const next = prev + 1;
          if (next >= steps.length) {
            setPlaying(false);
            return prev;
          }
          setTimeout(() => {
            if (!globalPausedRef.current) goToStepRef.current?.(next, { keepPlaying: true });
          }, emptyDelay);
          return prev;  // stay on current step until goToStep fires after delay
        }
        const next = prev + 1;
        if (next >= steps.length) {
          setPlaying(false);
          return prev;
        }
        setTimeout(() => goToStepRef.current(next, { keepPlaying: true }), 0);
        return next;
      });
      playTimeoutRef.current = setTimeout(scheduleNext, 16);
    };

    playTimeoutRef.current = setTimeout(scheduleNext, 0);

    return () => {
      clearInterval(playTimerRef.current);
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
    };
  }, [playing, steps.length]); // goToStep read via stable goToStepRef
}
