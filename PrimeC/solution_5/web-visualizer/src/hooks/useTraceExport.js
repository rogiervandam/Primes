/**
 * useTraceExport — PNG snapshot + WebM video recording of the current trace.
 *
 * The exporter is intentionally renderer-agnostic at the call site: it only
 * touches the renderer through these public hooks:
 *   - `r.canvas`                    — HTMLCanvasElement to capture
 *   - `r.toDataURL()`               — PNG snapshot of the current frame
 *   - `r.currentOperation`          — annotation channel set per step
 *   - `r.setState(...)`             — accepts the same shape used by the playback engine
 *   - `r.render()`                  — paints the current state
 *   - `r.vectorGroup`, `r.bitCount` — read-only geometry hints
 *
 * If you swap in a new visualization mode renderer (see docs/AI_MAINTENANCE.md),
 * the export pipeline keeps working as long as the renderer honours these.
 *
 * Returns { exporting, exportProgress, exportPng, exportVideo, cancelExport }.
 */
import { useCallback, useRef, useState } from 'react';

export function useTraceExport({
  rendererRef,
  steps,
  bitCount,
  currentStep,
  goToStep,
  autoRender,
}) {
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const exportCancelRef = useRef(false);

  const exportPng = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const url = r.toDataURL();
    const a = document.createElement('a');
    a.href = url;
    a.download = `sieve_step_${currentStep}.png`;
    a.click();
  }, [rendererRef, currentStep]);

  const exportVideo = useCallback(async () => {
    const r = rendererRef.current;
    if (!r || steps.length === 0 || exporting) return;
    setExporting(true);
    setExportProgress(0);
    exportCancelRef.current = false;

    try {
      const stream = r.canvas.captureStream(0);
      const track = stream.getVideoTracks()[0];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5_000_000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.start();

      const bs = new Uint8Array(bitCount);
      for (let i = 0; i < steps.length; i++) {
        if (exportCancelRef.current) break;
        const s = steps[i];
        for (let j = 0; j < s.changedBits.length; j++) {
          const idx = s.changedBits[j];
          if (idx < bs.length) bs[idx] = 1;
        }
        const changed = new Set(s.changedBits);
        const targetBits = s.targetBits && s.targetBits.length > 0 ? s.targetBits : s.changedBits;
        const targetSet = new Set(targetBits);
        const targetHitCounts = new Map();
        if (s.targetHitCounts && s.targetHitCounts.length === targetBits.length) {
          for (let k = 0; k < targetBits.length; k++) targetHitCounts.set(targetBits[k], s.targetHitCounts[k]);
        } else {
          for (let k = 0; k < targetBits.length; k++) targetHitCounts.set(targetBits[k], 1);
        }
        r.currentOperation = s.operation;
        r.setState(
          bs,
          changed,
          targetSet,
          targetHitCounts,
          { focusStart: s.focusStart, focusStop: s.focusStop },
          {
            wordBits: s.maskWordBits,
            targetWords: s.maskWriteOrderWords,
            targetSlots: s.maskWriteOrderSlots,
            slotBits: s.maskSlotBits,
          },
          {
            repeatedBits: new Set(
              Array.from(targetHitCounts.entries())
                .filter(([, count]) => count > 1)
                .map(([bit]) => bit),
            ),
          },
        );
        r.render();
        if (track.requestFrame) track.requestFrame();
        await new Promise((resolve) => setTimeout(resolve, 33));
        setExportProgress(Math.round(((i + 1) / steps.length) * 100));
      }

      recorder.stop();
      await new Promise((resolve) => { recorder.onstop = resolve; });

      if (!exportCancelRef.current) {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (autoRender) {
          // CLI / puppeteer mode: hand the blob to the host page so it can
          // pull it out without triggering a download dialog.
          window.__exportedVideo = blob;
          window.__renderComplete = true;
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sieve_trace.webm';
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('Video export failed:', err);
    }

    setExporting(false);
    setExportProgress(0);
    // Restore the step the user was looking at before the export started.
    goToStep(currentStep);
  }, [rendererRef, steps, bitCount, currentStep, exporting, goToStep, autoRender]);

  const cancelExport = useCallback(() => {
    exportCancelRef.current = true;
  }, []);

  return { exporting, exportProgress, exportPng, exportVideo, cancelExport };
}
