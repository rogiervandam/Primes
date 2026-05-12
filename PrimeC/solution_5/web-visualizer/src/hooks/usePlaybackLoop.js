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
 * @param {React.MutableRefObject} opts.isSingleEventLoopActiveRef
 * @param {React.MutableRefObject} opts.isScrubbingTopRef
 * @param {React.MutableRefObject} opts.initialHighlightHoldRef
 * @param {React.MutableRefObject} opts.delayBetweenRepeatsRef
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
 * @param {boolean}     opts.isSingleEventLoopActive
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
    isSingleEventLoopActiveRef,
    isScrubbingTopRef,
    initialHighlightHoldRef,
    delayBetweenRepeatsRef,
    delayBetweenEventsRef,   // item 217: auto-advance delay when repeat is disabled
    stepResumeStartIndexRef,
    stepResumeMaskProgressRef,
    setIsStepAnimRunningRef,
    isStepAnimRunningRefForScheduler,
    isAutoAnimateOnSelectRef,
    isSingleEventRepeatEnabledRef,
    repeatFractionRef,  // item 290: fraction 0-100 where repeat restarts from
  } = loopRefs;

  const {
    playing,
    steps,
    currentStep,
    selectedSteps,
    isAnimationReplayPaused,
    isSingleEventLoopActive,
  } = loopState;

  const {
    setPlaying,
    setCurrentStep,
    setIsSingleEventLoopActive,
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

  // ── Effect 2: When paused on a single step, keep replaying that step's animation ──
  useEffect(() => {
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }

    // The single-event widget's auto-replay only runs when the user explicitly
    // pressed Play on it (isSingleEventLoopActive=true), OR while the user is
    // mid-drag on the top-bar scrubber (isScrubbingTopRef.current). All-events
    // playback (`playing`) has its own scheduler so we stay out of its way.
    if (playing || isAnimationReplayPaused || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
    if (!isSingleEventLoopActive && !isScrubbingTopRef.current) return;
    const step = steps[currentStep];
    if (!step || !step.changedBits || step.changedBits.length === 0) return;

    const changed = new Set(step.changedBits);
    let cancelled = false;

    const loop = async () => {
      // First iteration honors the resume hints (set by the banner Play
      // button); subsequent iterations restart from 0 after the replay delay.
      const useStartIndex = stepResumeStartIndexRef.current || 0;
      const useStartProgress = stepResumeMaskProgressRef.current || 0;
      stepResumeStartIndexRef.current = 0;
      stepResumeMaskProgressRef.current = 0;
      // Read triggerAnimation through its ref so this effect doesn't tear down
      // and restart whenever the speed slider (bitAnimInterval) changes.
      const triggerFn = triggerAnimationRef.current;
      if (!triggerFn) return;
      await triggerFn(changed, {
        adaptiveDuration: true,
        // Between repeats inside the single-event widget: use the configured
        // delayBetweenRepeats. Mid-drag scrub: 0 (each drag tick re-triggers).
        delayMs: isScrubbingTopRef.current ? 0 : (delayBetweenRepeatsRef.current || 0),
        startIndex: useStartIndex,
        startProgress: useStartProgress,
      });
      if (!isScrubbingTopRef.current && isSingleEventRepeatEnabledRef && isSingleEventRepeatEnabledRef.current === false) {
        // item 217: repeat disabled → auto-advance to the next event after the configured delay
        setIsSingleEventLoopActive(false);
        const delay = delayBetweenEventsRef?.current ?? 0;
        setTimeout(() => {
          if (!isSingleEventLoopActiveRef.current) {
            goToStepRef.current?.(currentStep + 1);
          }
        }, delay);
        return;
      }
      if (cancelled || playing || isAnimationReplayPaused || selectedSteps.size > 0) return;
      if (!isSingleEventLoopActiveRef.current && !isScrubbingTopRef.current) return;
      // Note: seekGenRef is intentionally NOT checked here. seekStepAnimation sets
      // cancelled=true via effect cleanup; that path is handled above. A seekGenRef
      // bump from the [animMode,animStyle] effect means animation style changed —
      // we want the loop to restart with the new style, not exit.
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
    // triggerAnimation intentionally omitted: it is rebuilt whenever the speed
    // slider changes, and we don't want to interrupt an in-flight reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, selectedSteps, steps, currentStep, isAnimationReplayPaused, isSingleEventLoopActive, setIsSingleEventLoopActive]);

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
        // advancing (no-repeat) or repeating (repeat mode), and show "NO CHANGES" UI.
        const curStep = steps[prev];
        const hasNoAnimation = !curStep || (
          !(curStep.changedBits?.length > 0) &&
          !(curStep.maskWriteOrderWords?.length > 0)
        );
        if (hasNoAnimation) {
          const emptyDelay = isSingleEventRepeatEnabledRef?.current
            ? 2000  // item 240: 2-second hold in repeat mode
            : (delayBetweenEventsRef?.current ?? 0);
          // Block the scheduler for the duration of the delay using animBusyUntilRef.
          // This prevents the scheduler from immediately re-entering this callback.
          animBusyUntilRef.current = performance.now() + Math.max(emptyDelay, 1);
          if (isSingleEventRepeatEnabledRef?.current) {
            const repeatStartProgress = (repeatFractionRef?.current ?? 0) / 100;
            const repeatOpts = repeatStartProgress > 0
              ? { keepPlaying: true, startProgress: repeatStartProgress }
              : { keepPlaying: true };
            setTimeout(() => {
              if (!globalPausedRef.current) goToStepRef.current?.(prev, repeatOpts);
            }, emptyDelay);
            return prev;  // stay on current step during delay
          } else {
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
        }
        // item 226: when repeat is on, replay current event instead of advancing
        if (isSingleEventRepeatEnabledRef?.current) {
          // item 290: restart from the repeat fraction point if set
          const repeatStartProgress = (repeatFractionRef?.current ?? 0) / 100;
          const repeatOpts = repeatStartProgress > 0
            ? { keepPlaying: true, startProgress: repeatStartProgress }
            : { keepPlaying: true };
          setTimeout(() => goToStepRef.current?.(prev, repeatOpts), 0);
          return prev;
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
