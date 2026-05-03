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
 *    Play mode (`singleEventLoopActive`) or while the user is mid-drag on the
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
 * @param {React.MutableRefObject} opts.singleEventLoopActiveRef
 * @param {React.MutableRefObject} opts.isScrubbingTopRef
 * @param {React.MutableRefObject} opts.initialHighlightHoldRef
 * @param {React.MutableRefObject} opts.delayBetweenRepeatsRef
 * @param {React.MutableRefObject} opts.stepResumeStartIndexRef
 * @param {React.MutableRefObject} opts.stepResumeMaskProgressRef
 * @param {React.MutableRefObject} opts.setStepAnimRunningRef
 * @param {React.MutableRefObject} opts.stepAnimRunningRefForScheduler
 *
 * State values (used in effect dep arrays only):
 * @param {boolean}     opts.playing
 * @param {Array}       opts.steps
 * @param {number}      opts.currentStep
 * @param {Set<number>} opts.selectedSteps
 * @param {boolean}     opts.animationReplayPaused
 * @param {boolean}     opts.singleEventLoopActive
 * @param {React.MutableRefObject} [opts.autoAnimateOnSelectRef] - When false, skip the auto-repeat loop
 * @param {boolean}     [opts.autoAnimateOnSelect] - State mirror for dep array
 *
 * State setters (stable across renders):
 * @param {function} opts.setPlaying
 * @param {function} opts.setCurrentStep
 */
import { useEffect } from 'react';

export function usePlaybackLoop({
  // Playback clock refs
  seekGenRef, globalPausedRef, animBusyUntilRef,
  // Stable function refs
  triggerAnimationRef, goToStepRef,
  // Renderer ref
  rendererRef,
  // Per-loop timer refs (declared in Visualizer; shared with seekStepAnimation + stopPlayback)
  selectedAnimLoopRef, pausedStepAnimLoopRef,
  playTimeoutRef, playTimerRef,
  // Per-loop state refs
  singleEventLoopActiveRef, isScrubbingTopRef, initialHighlightHoldRef,
  delayBetweenRepeatsRef, stepResumeStartIndexRef, stepResumeMaskProgressRef,
  setStepAnimRunningRef, stepAnimRunningRefForScheduler,
  // State values (for effect dependency arrays only)
  playing, steps, currentStep, selectedSteps, animationReplayPaused, singleEventLoopActive,
  autoAnimateOnSelect = true,
  // State setters
  setPlaying, setCurrentStep,
  // Optional preference refs
  autoAnimateOnSelectRef,
}) {
  // ── Effect 1: Repeat selected-step animation until selection changes ─────
  useEffect(() => {
    if (selectedAnimLoopRef.current) {
      clearTimeout(selectedAnimLoopRef.current);
      selectedAnimLoopRef.current = null;
    }
    if (playing || animationReplayPaused || selectedSteps.size === 0) return;
    // When auto-animate-on-select is disabled, do not start the replay loop.
    if (autoAnimateOnSelectRef && autoAnimateOnSelectRef.current === false) return;

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
      if (cancelled || playing || animationReplayPaused || selectedSteps.size === 0) return;
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
    // autoAnimateOnSelect is included so the loop tears down immediately when the toggle is switched off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSteps, steps, playing, animationReplayPaused, autoAnimateOnSelect]);

  // ── Effect 2: When paused on a single step, keep replaying that step's animation ──
  useEffect(() => {
    if (pausedStepAnimLoopRef.current) {
      clearTimeout(pausedStepAnimLoopRef.current);
      pausedStepAnimLoopRef.current = null;
    }

    // The single-event widget's auto-replay only runs when the user explicitly
    // pressed Play on it (singleEventLoopActive=true), OR while the user is
    // mid-drag on the top-bar scrubber (isScrubbingTopRef.current). All-events
    // playback (`playing`) has its own scheduler so we stay out of its way.
    if (playing || animationReplayPaused || selectedSteps.size > 0 || initialHighlightHoldRef.current) return;
    if (!singleEventLoopActive && !isScrubbingTopRef.current) return;
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
      if (cancelled || playing || animationReplayPaused || selectedSteps.size > 0) return;
      if (!singleEventLoopActiveRef.current && !isScrubbingTopRef.current) return;
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
  }, [playing, selectedSteps, steps, currentStep, animationReplayPaused, singleEventLoopActive]);

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
      if (setStepAnimRunningRef.current && stepAnimRunningRefForScheduler.current) {
        playTimeoutRef.current = setTimeout(scheduleNext, 32);
        return;
      }

      setCurrentStep((prev) => {
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
