import { useCallback, useEffect, useRef } from 'react';
import {
  getProjectedCanvasMapper,
  computeSafeTiltDegrees,
  computeAutoGlYOffset,
} from '../lib/canvasProjection';
import { usesWebGLTilt, usesViewportSizeCanvas, usesGridSizeCanvas } from '../lib/renderModes';

/**
 * Owns the oversized-plane canvas geometry, GL CSS lock management,
 * and the two imperative effects that keep GL/glyph canvas transforms
 * in sync with the camera and debug offsets.
 *
 * Returns:
 *   getCanvasTargetSize   – compute target canvas dimensions for the current tilt
 *   getCanvasPlaneMetrics – viewport ↔ canvas-plane coordinate metadata
 *   captureViewportAnchor – snapshot a canvas point under a viewport ratio
 *   refreshCanvasLayout   – full resize/reposition pass (call after resize / panel toggle)
 *   forceGlRedraw         – emergency unlock + redraw for Chrome/Edge GL stalls
 */
export function useCanvasLayout({
  rendererRef,
  containerRef,
  glCanvasRef,
  glRendererRef,
  glyphCanvasRef,
  glyph2DCanvasRef,
  wrapperCanvasRef,
  glCssUnlockTokenRef,
  glCssUnlockRafRef,
  glCssUnlockTimeoutRef,
  glCssLockStateRef,
  camera3DRef,
  camera3DTransform,
  debugGlAutoOffsetYRef,
  debugGlOffsetXRef,
  debugGlOffsetYRef,
  canvasAnchorPx,
  debugGlOffsetX,
  debugGlOffsetY,
  debugGlAutoOffsetY,
  debugRenderTuning,
  renderMode,
  setDebugGlAutoOffsetY,
  setCamera3DTransform,
  setCamera3DContainerStyle,
  addCameraDomListener,
  setAutoFitColumnCount,
  isMinimapVisible,
  updateMinimapAvailability,
  getMinimapDetailH,
}) {
  const asPositiveNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const asPercent = (value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 100;
  };

  const resolveLayerCssSize = (baseW, baseH, percentValue, manualActive, manualW, manualH) => {
    const scale = asPercent(percentValue) / 100;
    const fallbackW = baseW * scale;
    const fallbackH = baseH * scale;
    const w = manualActive ? (asPositiveNumber(manualW) || fallbackW) : fallbackW;
    const h = manualActive ? (asPositiveNumber(manualH) || fallbackH) : fallbackH;
    return {
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
    };
  };

  // Keep a ref to camera3DTransform so callbacks that don't list it in their
  // dep array can still read the latest value without creating stale closures.
  const camera3DTransformRef = useRef(camera3DTransform);
  camera3DTransformRef.current = camera3DTransform;

  // Keep a ref to renderMode for the same reason (read inside memoised callbacks).
  const renderModeRef = useRef(renderMode);
  renderModeRef.current = renderMode;

  // Forcibly cancel any pending GL CSS unlock, clear the resize-lock, apply
  // the correct CSS size to the GL canvas, and trigger a full redraw.
  // Useful when Chrome/Edge gets stuck showing a stale or invisible GL layer
  // after a resize (e.g. the backing-store poll never matched, or the unlock
  // rAF was dropped).
  const forceGlRedraw = useCallback(() => {
    // Invalidate any in-flight unlock token so pending rAFs/timeouts are no-ops.
    ++glCssUnlockTokenRef.current;
    if (glCssUnlockRafRef.current != null) {
      cancelAnimationFrame(glCssUnlockRafRef.current);
      glCssUnlockRafRef.current = null;
    }
    if (glCssUnlockTimeoutRef.current != null) {
      clearTimeout(glCssUnlockTimeoutRef.current);
      glCssUnlockTimeoutRef.current = null;
    }
    glCssLockStateRef.current = null;
    // Re-apply the correct CSS size and rotation to the GL canvas.
    const glEl = glCanvasRef.current;
    const r = rendererRef.current;
    if (glEl && r) {
      const w = r.canvasWidth || 0;
      const h = r.canvasHeight || 0;
      if (w > 0 && h > 0) {
        glEl.style.width = `${w}px`;
        glEl.style.height = `${h}px`;
      }
      const rot = usesWebGLTilt(renderMode)
        ? ''
        : (camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '');
      glEl.style.transform = rot;
    }
    // Force a full redraw (Canvas2D + GL worker).
    if (r) r.render();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCanvasTargetSize = useCallback((width, height) => {
    // Unified geometry: the canvas is ALWAYS the oversized 3D plane,
    // regardless of whether the camera is currently tilted. 2D mode
    // is just "3D with rotateX = rotateY = 0". This means panel
    // toggles never change the canvas size (no grid reflow / drift)
    // and the 2D and 3D placements are identical.
    //
    // We use the largest of (current container, viewport) as the
    // baseline so collapsing/expanding side panels can't shrink
    // the canvas — those toggles must be visually free.
    const cam = camera3DRef.current;
    // Read angles directly from the camera ref rather than from the
    // camera3DTransform React state. camera3DTransform changes on every tilt
    // animation frame, which would make this callback unstable → cause
    // refreshCanvasLayout to be re-created → the resize useEffect re-fires
    // every pointer-move during a tilt gesture (calling the heavy
    // refreshCanvasLayout 60fps). camera3DRef is a stable ref so this
    // callback stays memoised for the lifetime of the camera instance.
    // canvas layout is explicitly re-triggered at gesture end (schedulePostLayoutRefresh).
    const baseW = Math.max(width || 0, (typeof window !== 'undefined' ? window.innerWidth : width) || 0);
    const baseH = Math.max(height || 0, (typeof window !== 'undefined' ? window.innerHeight : height) || 0);

    // Viewport-size modes (3 & 7): render at ~120% of window resolution.
    // The small overscan (20%) prevents content near the screen edges from
    // being clipped by the canvas boundary while still avoiding the large
    // 3.2× headroom used by the CSS-tilt modes.
    // The 3D perspective transform is done entirely in the shader, so the
    // canvas itself stays a flat, centered rectangle.
    if (usesViewportSizeCanvas(renderModeRef.current)) {
      return {
        canvasW: Math.max(1, Math.round(baseW * 1.2)),
        canvasH: Math.max(1, Math.round(baseH * 1.2)),
      };
    }

    // Grid-size modes (2 & 6): single GL canvas with CSS tilt. Size the
    // canvas to match the current grid content dimensions, capped at 4×
    // the window area so very large grids don't exceed GL texture limits.
    if (usesGridSizeCanvas(renderModeRef.current)) {
      const r = rendererRef.current;
      let gridW = baseW;
      let gridH = baseH;
      if (r && r.layoutMetrics && r.bitCount > 0) {
        try {
          const metrics = r.layoutMetrics;
          const vecPerRow = metrics.vectorGroupsPerVisualRow();
          const totalSlots = metrics.totalVectorSlots();
          const totalVRows = Math.ceil(totalSlots / Math.max(1, vecPerRow));
          const vecDims = metrics.vectorDims();
          const rowDims = metrics.rowDims();
          const labelH = metrics.labelHeight();
          const u64GapX = metrics.u64GapX();
          const u64GapY = metrics.u64GapY();
          const vRowH = labelH + rowDims.h + u64GapY;
          // vecPerRow vectors across, spaced by vecDims.w + u64GapX; last gap omitted
          const vRowW = vecPerRow * (vecDims.w + u64GapX) - u64GapX;
          if (vRowW > 0 && vRowH > 0 && totalVRows > 0) {
            gridW = vRowW * 1.05; // 5 % margin
            gridH = totalVRows * vRowH * 1.05;
          }
        } catch { /* fall through to baseW/baseH */ }
      }
      // Ensure at least viewport size so tilted edges don't leave gaps.
      const rawW = Math.max(baseW, gridW);
      const rawH = Math.max(baseH, gridH);
      // Cap total area at 4× window area; scale proportionally if needed.
      const winArea = baseW * baseH;
      const maxArea = 4 * winArea;
      let canvasW = rawW;
      let canvasH = rawH;
      if (canvasW * canvasH > maxArea && maxArea > 0) {
        const scale = Math.sqrt(maxArea / (canvasW * canvasH));
        canvasW = canvasW * scale;
        canvasH = canvasH * scale;
      }
      return {
        canvasW: Math.max(1, Math.round(canvasW)),
        canvasH: Math.max(1, Math.round(canvasH)),
      };
    }
    let scaleH = 1;
    let scaleW = 1;
    let diagonalOverscan = 1;
    if (cam && cam.enabled) {
      const rotateX = cam.rotateX || 0;
      const rotateY = cam.rotateY || 0;
      const ax = Math.abs(rotateX) * Math.PI / 180;
      const ay = Math.abs(rotateY) * Math.PI / 180;
      scaleH = 1 / Math.max(0.3, Math.cos(ax));
      scaleW = 1 / Math.max(0.3, Math.cos(ay));
      diagonalOverscan = 1 + Math.hypot(Math.sin(ax), Math.sin(ay)) * 0.55;
    }
    const dragOverscan = 3.1;
    const canvasWRaw = Math.max(baseW * 3.2, baseW * scaleW * diagonalOverscan * dragOverscan);
    const canvasHRaw = Math.max(baseH * 3.2, baseH * scaleH * diagonalOverscan * dragOverscan);
    // Keep CSS and backing geometry on integer CSS pixels to avoid
    // fractional-size drift between GL and Canvas2D at large canvas sizes.
    const canvasW = Math.max(1, Math.round(canvasWRaw));
    const canvasH = Math.max(1, Math.round(canvasHRaw));
    return { canvasW, canvasH };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCanvasPlaneMetrics = useCallback(() => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const canvasEl = r.canvas || glCanvasRef.current;
    const planeW = r.canvasWidth || canvasEl?.offsetWidth || rect.width;
    const planeH = r.canvasHeight || canvasEl?.offsetHeight || rect.height;
    const mapper = getProjectedCanvasMapper(canvasEl);
    // Canvas elements live inside the canvas-transform-wrapper div, which uses
    // translate(-50%,-50%) to pin to the viewport centre. Reading canvas
    // style.left gives the intra-wrapper offset (always 0), not the wrapper's
    // container-relative anchor. Use canvasAnchorPx (maintained frame-by-frame
    // by useCanvasAnchorSync) so the plane-offset is always correct — both for
    // the projective-mapper fallback path (e.g. Safari) and for cam.screenToCanvas.
    const anchorLeft = canvasAnchorPx?.left ?? rect.width / 2;
    const anchorTop  = canvasAnchorPx?.top  ?? rect.height / 2;
    return {
      rect,
      planeW,
      planeH,
      planeOffsetX: planeW / 2 - anchorLeft,
      planeOffsetY: planeH / 2 - anchorTop,
      canvasToViewport: mapper?.toViewport || null,
      viewportToCanvas: mapper?.toCanvas || null,
    };
  }, [canvasAnchorPx]); // eslint-disable-line react-hooks/exhaustive-deps

  const captureViewportAnchor = useCallback((xRatio = 0.5, yRatio = 0.5) => {
    const r = rendererRef.current;
    const metrics = getCanvasPlaneMetrics();
    if (!r || !metrics) return null;
    const { rect, planeW, planeH, planeOffsetX, planeOffsetY } = metrics;
    const clientX = rect.left + rect.width * xRatio;
    const clientY = rect.top + rect.height * yRatio;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const cam = camera3DRef.current;
    const canvasPoint = cam && cam.enabled
      ? cam.screenToCanvas(localX, localY, planeW, planeH, planeOffsetX, planeOffsetY)
      : { x: planeOffsetX + localX, y: planeOffsetY + localY };
    return {
      clientX,
      clientY,
      contentX: (canvasPoint.x - r.panX) / Math.max(0.0001, r.zoom || 1),
      contentY: (canvasPoint.y - r.panY) / Math.max(0.0001, r.zoom || 1),
    };
  }, [getCanvasPlaneMetrics]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshCanvasLayout = useCallback((anchor = null) => {
    const r = rendererRef.current;
    const el = containerRef.current;
    if (!r || !el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { canvasW, canvasH } = getCanvasTargetSize(rect.width, rect.height);

    // Perspective safety: as canvas plane height grows, large rotateX values
    // can produce extreme perspective amplification near the top edge. Cap
    // tilt dynamically so rendered geometry remains stable at high zoom.
    const cam = camera3DRef.current;
    if (cam && cam.enabled) {
      const safeTilt = computeSafeTiltDegrees(canvasH, cam.perspective || 1500);
      cam.maxTilt = safeTilt * 10; // alow some user experimentation
      let clamped = false;
      if (Math.abs(cam.rotateX) > safeTilt) {
        cam.rotateX = Math.sign(cam.rotateX || 1) * safeTilt;
        clamped = true;
      }
      if (Math.abs(cam.rotateY) > safeTilt) {
        cam.rotateY = Math.sign(cam.rotateY || 1) * safeTilt;
        clamped = true;
      }
      if (clamped) {
        setCamera3DTransform(cam.getCanvasTransform());
        setCamera3DContainerStyle(cam.getContainerStyle());
      }
    }

    const oldCanvasW = r.canvasWidth || 0;
    const oldCanvasH = r.canvasHeight || 0;
    const baseDpr = ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const dprPercent = asPercent(debugRenderTuning?.dprPercent);
    const computedDpr = baseDpr * (dprPercent / 100);
    const forcedDpr = debugRenderTuning?.dprManualActive
      ? (asPositiveNumber(debugRenderTuning?.dprManualValue) || computedDpr)
      : computedDpr;
    const glAaScaleRaw = Number(debugRenderTuning?.glAaScale);
    const glAaScale = (Number.isFinite(glAaScaleRaw) && glAaScaleRaw > 1) ? glAaScaleRaw : 1;
    const glForcedDpr = forcedDpr * glAaScale;
    const useShaderTilt = usesWebGLTilt(renderMode);
    const glCssSize = resolveLayerCssSize(
      canvasW,
      canvasH,
      debugRenderTuning?.glPercent,
      debugRenderTuning?.glManualActive === true,
      debugRenderTuning?.glManualW,
      debugRenderTuning?.glManualH,
    );
    const overlayCssSize = resolveLayerCssSize(
      canvasW,
      canvasH,
      debugRenderTuning?.overlayPercent,
      debugRenderTuning?.overlayManualActive === true,
      debugRenderTuning?.overlayManualW,
      debugRenderTuning?.overlayManualH,
    );
    // In shader-tilt modes the glyph GL overlay must share the exact same
    // CSS geometry as the bit-grid layer, otherwise perspective depth drifts.
    const effectiveOverlayCssSize = useShaderTilt ? glCssSize : overlayCssSize;
    const glyph2DCssSize = resolveLayerCssSize(
      canvasW,
      canvasH,
      debugRenderTuning?.glyph2DPercent,
      debugRenderTuning?.glyph2DManualActive === true,
      debugRenderTuning?.glyph2DManualW,
      debugRenderTuning?.glyph2DManualH,
    );
    const hasLayerSizeOverride =
      glCssSize.width !== canvasW
      || glCssSize.height !== canvasH
      || effectiveOverlayCssSize.width !== canvasW
      || effectiveOverlayCssSize.height !== canvasH
      || glyph2DCssSize.width !== canvasW
      || glyph2DCssSize.height !== canvasH;
    const glRenderer = glRendererRef.current;
    const glDirectMode = !!(glRenderer && typeof glRenderer.isDirectMode === 'function' && glRenderer.isDirectMode());
    let overlayDpr = null;
    if (glRenderer) {
      glRenderer.resize(canvasW, canvasH, glForcedDpr, forcedDpr);
      if (typeof glRenderer.getEffectiveDpr === 'function') {
        overlayDpr = glRenderer.getEffectiveDpr();
      }
    }
    // Always use the clamped DPR (overlayDpr) that BitGridGLWorker.resize()
    // actually applied.  This is critical for two reasons:
    //
    // 1. Single-canvas modes (2/3/6/7): glyph commands are replayed onto the
    //    shared bit-grid canvas.  If canvasDpr > the canvas's actual DPR,
    //    GlyphTextGLCore.beginFrame tries to resize (and clears) the canvas.
    //
    // 2. Separate-overlay modes (1/4/5/8): the bit-grid shader uses
    //    u_dpr = clampedGlForcedDpr for sub-pixel snapping.  If the glyph
    //    overlay uses a different u_dpr (e.g. glForcedDpr when clamping
    //    occurs), the two snap grids diverge and outlines/text visibly
    //    misalign from cells.  Using the same clamped value keeps both
    //    canvases on an identical snap grid.
    //
    // When no clamping occurs, overlayDpr === glForcedDpr, so full SSAA
    // resolution is preserved on the glyph canvas.
    r.resize(canvasW, canvasH, overlayDpr || forcedDpr, forcedDpr);
    // Sync wrapper div and GL canvas dimensions so translate(-50%,-50%) in
    // renderCanvasStyle computes the correct pixel shift (50% of the wrapper's
    // own size) and the GL canvas CSS display always matches Canvas2D.
    // Must happen imperatively here (before the next paint) rather than
    // waiting for a React re-render, so that the centering is correct on the
    // very first frame after a resize.
    //
    // GL canvas sizing: the wrapper is updated to the new size immediately
    // (for correct centering via translate(-50%,-50%)). The GL canvas CSS is
    // locked to the OLD size until the worker has drawn at the new size. This
    // prevents the browser from CSS-scaling the old drawing buffer to the new
    // CSS dimensions, which caused the grid and annotations to move in opposite
    // directions during window resize (and zoom appearing to affect only
    // annotations). A requestAnimationFrame deferred step below updates the GL
    // canvas CSS to the new size after the worker messages have been processed.
    //
    // On Safari (direct mode), resize is synchronous so the deferred update is
    // harmless (just re-sets the same value one frame later).

    const wrapperEl = wrapperCanvasRef.current;
    if (wrapperEl) {
      wrapperEl.style.width = `${canvasW}px`;
      wrapperEl.style.height = `${canvasH}px`;
    }
    const glEl = glCanvasRef.current;
    const glSizeChanging = glEl && (canvasW !== oldCanvasW || canvasH !== oldCanvasH);
    // Read angles directly from the camera ref — avoids a stale closure on
    // camera3DTransform (which is not in this callback's dep array).
    const appliedAngles = cam && cam.enabled
      ? { rotateX: cam.rotateX || 0, rotateY: cam.rotateY || 0 }
      : { rotateX: 0, rotateY: 0 };
    let autoGlOffsetY = 0;
    if (!usesWebGLTilt(renderMode) && glDirectMode && glRenderer && typeof glRenderer.getEffectiveDpr === 'function') {
      autoGlOffsetY = computeAutoGlYOffset(
        canvasH,
        glRenderer.getEffectiveDpr(),
        appliedAngles.rotateX,
        appliedAngles.rotateY,
        canvasW,
      );
    }
    debugGlAutoOffsetYRef.current = autoGlOffsetY;
    setDebugGlAutoOffsetY((prev) => (prev === autoGlOffsetY ? prev : autoGlOffsetY));
    const totalGlOffsetX = debugGlOffsetXRef.current || 0;
    const totalGlOffsetY = autoGlOffsetY + (debugGlOffsetYRef.current || 0);
    const centeredGlLeft = (canvasW - glCssSize.width) / 2 + totalGlOffsetX;
    const centeredGlTop = (canvasH - glCssSize.height) / 2 + totalGlOffsetY;
    // Rotation string shared by both the GL canvas and the glyph overlay canvas.
    // Defined outside if(glEl) so the glyph canvas update below can use it.
    const rotStr = useShaderTilt
      ? ''
      : (camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '');
    const makeGlTransform = (translateStr) => [rotStr, translateStr].filter(Boolean).join(' ');

    if (glEl) {
      // Always keep GL anchored from top-left with explicit size. Chromium can
      // behave inconsistently when right/bottom constraints remain active while
      // width/height are also assigned dynamically.
      glEl.style.left = `${centeredGlLeft}px`;
      glEl.style.top = `${centeredGlTop}px`;
      glEl.style.right = 'auto';
      glEl.style.bottom = 'auto';

      if (glDirectMode) {
        // Direct mode renders synchronously on the main thread, so we do not
        // need the worker catch-up CSS lock. Applying it in Chromium can
        // itself introduce drift during horizontal window growth.
        glCssLockStateRef.current = null;
        glEl.style.width = `${glCssSize.width}px`;
        glEl.style.height = `${glCssSize.height}px`;
        glEl.style.transform = makeGlTransform('');
      } else {
        if (hasLayerSizeOverride) {
          glCssLockStateRef.current = null;
          glEl.style.width = `${glCssSize.width}px`;
          glEl.style.height = `${glCssSize.height}px`;
          glEl.style.transform = makeGlTransform('');
        } else {
        const activeGlCssLock = glCssLockStateRef.current;
        if (!glSizeChanging) {
          if (activeGlCssLock
            && activeGlCssLock.targetW === canvasW
            && activeGlCssLock.targetH === canvasH) {
            glEl.style.width = `${activeGlCssLock.lockW}px`;
            glEl.style.height = `${activeGlCssLock.lockH}px`;
            glEl.style.transform = makeGlTransform(activeGlCssLock.translateTransform);
          } else {
            // Size unchanged: set immediately (no CSS-scale risk).
            glEl.style.width = `${canvasW}px`;
            glEl.style.height = `${canvasH}px`;
            glEl.style.transform = makeGlTransform('');
          }
        } else {
          // Size IS changing: lock GL canvas CSS to the OLD size (overriding
          // the CSS `inset: 0` rule, which would otherwise auto-expand the GL
          // canvas to fill the newly-resized wrapper). This prevents the browser
          // from CSS-scaling the old drawing buffer to the new wrapper dimensions.
          // A rAF deferred step after r.render() updates to the new size.
          const lockW = oldCanvasW > 0 ? oldCanvasW : canvasW;
          const lockH = oldCanvasH > 0 ? oldCanvasH : canvasH;
          glEl.style.width = `${lockW}px`;
          glEl.style.height = `${lockH}px`;
          // The wrapper is resized immediately to the new dimensions. Because
          // the GL canvas is position:absolute at (0,0) inside the wrapper, the
          // wrapper growing/shrinking shifts the GL canvas in screen space by
          // ±deltaW/2 (half the width change). Meanwhile Canvas2D re-renders
          // with an updated panX (= old panX + deltaW/2), which shifts the
          // rendered content by +deltaW/2 in the SAME direction. The combined
          // effect means we need to shift the locked GL frame by a full deltaW
          // (= canvasW - oldCanvasW) to make the old GL cells appear at the same
          // screen positions as the new Canvas2D annotations.
          //   GL visual left  = wrapperLeft + deltaW
          //                   = (center − newW/2) + (newW − oldW)
          //                   = center + newW/2 − oldW
          //   C2D content at W = (center − newW/2) + (newW/2 + panX_new)
          //                    = center + panX_new  (same world → same screen ✓)
          const glDx = canvasW - lockW;
          const glDy = canvasH - lockH;
          // Store only the translate part so it can be re-composed with the
          // (possibly changing) rotation when the lock is later restored.
          const lockTranslate = (glDx !== 0 || glDy !== 0) ? `translate(${glDx}px, ${glDy}px)` : '';
          glEl.style.transform = makeGlTransform(lockTranslate);
          glCssLockStateRef.current = {
            targetW: canvasW,
            targetH: canvasH,
            lockW,
            lockH,
            translateTransform: lockTranslate,
          };
        }
        }
      }
    }
    // Apply the same rotation to the glyph overlay canvas. It fills the wrapper
    // via CSS (inset: 0) so only the rotation is needed — no position offset.
    const glyphOverlayEl = glyphCanvasRef.current;
    if (glyphOverlayEl) {
      glyphOverlayEl.style.left = `${(canvasW - effectiveOverlayCssSize.width) / 2}px`;
      glyphOverlayEl.style.top = `${(canvasH - effectiveOverlayCssSize.height) / 2}px`;
      glyphOverlayEl.style.width = `${effectiveOverlayCssSize.width}px`;
      glyphOverlayEl.style.height = `${effectiveOverlayCssSize.height}px`;
      glyphOverlayEl.style.transform = rotStr;
    }
    const glyph2DOverlayEl = glyph2DCanvasRef.current;
    if (glyph2DOverlayEl) {
      glyph2DOverlayEl.style.left = `${(canvasW - glyph2DCssSize.width) / 2}px`;
      glyph2DOverlayEl.style.top = `${(canvasH - glyph2DCssSize.height) / 2}px`;
      glyph2DOverlayEl.style.width = `${glyph2DCssSize.width}px`;
      glyph2DOverlayEl.style.height = `${glyph2DCssSize.height}px`;
      glyph2DOverlayEl.style.transform = rotStr;
    }
    // Keep grid content stable when the window (and therefore the canvas)
    // resizes. The canvas is centered at the viewport center, so when the
    // canvas grows by dCanvasW its left edge moves left by dCanvasW/2.
    // Compensating panX by dCanvasW/2 keeps every canvas-coord the same
    // distance from the canvas center, which means the 3D perspective
    // projection is unchanged (no lean/tilt artefact). In 2D the content
    // drifts by dWindowW/2 — the natural "window-center moved" effect —
    // which is far less disruptive than the original 1.1×dWindowW drift.
    if (oldCanvasW > 0) {
      r.panX += (canvasW - oldCanvasW) / 2;
      r.panY += (canvasH - oldCanvasH) / 2;
    }
    // Tell the renderer the layout-available area so the grid
    // wrapping math (`_computeClPerVRow`) targets a STABLE size,
    // not the live container rect. Using `window.innerWidth/Height`
    // means panel toggles don't change the chosen column count and
    // therefore don't reflow / drift the grid; the user just sees
    // more or less of the same plane through the resized container.
    const lvW = (typeof window !== 'undefined' ? window.innerWidth : rect.width) || rect.width;
    const lvH = (typeof window !== 'undefined' ? window.innerHeight : rect.height) || rect.height;
    r.layoutAvailWidth = lvW;
    r.layoutAvailHeight = lvH;
    r.unfreezeLayout();
    r.freezeLayout();
    if (r.horizontalGroups === 0 && typeof r._cacheLinesPerVisualRow === 'function') {
      const nextAutoCols = Math.max(1, r._cacheLinesPerVisualRow());
      setAutoFitColumnCount((prev) => (prev === nextAutoCols ? prev : nextAutoCols));
    }

    // Store the actual visible container dimensions on the renderer so that
    // renderMinimap and updateMinimapAvailability use the real viewport size
    // rather than the oversized (3×) drag-headroom canvas dimensions.
    r.viewportW = rect.width;
    r.viewportH = rect.height;

    // NOTE: anchor-based panX/panY compensation removed for panel toggles.
    // With the canvas pinned to the VIEWPORT center (see canvasAnchorPx and
    // renderCanvasStyle), the canvas no longer moves when the container
    // reshapes on a panel toggle (canvasW/H are based on windowW/H, not
    // containerW/H, so they don't change on panel toggles), so there is
    // nothing to compensate for. Window-resize is handled above via the
    // dCanvasW/2 adjustment which preserves canvas-center-relative content
    // positions and keeps the 3D perspective projection stable.
    void anchor;

    const glRenderSeq = r.render(); // eslint-disable-line no-unused-vars
    // After r.render() the patched render has posted resize+positions+render
    // messages to the GL worker. For width-growth resizes, wait for an
    // explicit worker render-ack before unlocking GL canvas CSS to the new
    // dimensions so the browser never stretches an old drawing buffer.
    // Keep a short timeout fallback to avoid stalls if the worker is busy.
    if (glSizeChanging && !glDirectMode && !hasLayerSizeOverride) {
      const targetW = canvasW;
      const targetH = canvasH;
      const targetEl = glEl;
      const g = glRendererRef.current;
      const targetDpr = g && typeof g.getEffectiveDpr === 'function'
        ? g.getEffectiveDpr()
        : ((window.devicePixelRatio || 1));
      // Use Math.round to match bitGridGLCore.js which also uses Math.round
      // when setting canvas.width/height. Using Math.floor here caused a
      // rounding mismatch (e.g. 801 × 1.5 → floor=1201, round=1202) that
      // prevented waitForGlBackingStore from ever finding a match, forcing
      // every horizontal-growth resize to wait for the full 80 ms timeout.
      const targetPxW = Math.max(1, Math.round(targetW * targetDpr));
      const targetPxH = Math.max(1, Math.round(targetH * targetDpr));
      const token = ++glCssUnlockTokenRef.current;
      if (glCssUnlockRafRef.current != null) {
        cancelAnimationFrame(glCssUnlockRafRef.current);
        glCssUnlockRafRef.current = null;
      }
      if (glCssUnlockTimeoutRef.current != null) {
        clearTimeout(glCssUnlockTimeoutRef.current);
        glCssUnlockTimeoutRef.current = null;
      }
      const applyUnlockedSize = () => {
        if (token !== glCssUnlockTokenRef.current) return;
        glCssUnlockRafRef.current = requestAnimationFrame(() => {
          glCssUnlockRafRef.current = null;
          if (token !== glCssUnlockTokenRef.current) return;
          if (targetEl) {
            glCssLockStateRef.current = null;
            targetEl.style.width = `${targetW}px`;
            targetEl.style.height = `${targetH}px`;
            // Restore just the rotation — no resize-lock translate remains.
            const rot = usesWebGLTilt(renderMode)
              ? ''
              : (camera3DTransformRef.current !== 'none' ? camera3DTransformRef.current : '');
            targetEl.style.transform = rot;
            // Keep glyph overlay in sync.
            const glyphUnlockEl = glyphCanvasRef.current;
            if (glyphUnlockEl) glyphUnlockEl.style.transform = rot;
            const glyph2DUnlockEl = glyph2DCanvasRef.current;
            if (glyph2DUnlockEl) glyph2DUnlockEl.style.transform = rot;
          }
        });
      };
      const waitForGlBackingStore = () => {
        if (token !== glCssUnlockTokenRef.current) return;
        if (!targetEl) {
          applyUnlockedSize();
          return;
        }
        if (targetEl.width === targetPxW && targetEl.height === targetPxH) {
          applyUnlockedSize();
          return;
        }
        glCssUnlockRafRef.current = requestAnimationFrame(() => {
          waitForGlBackingStore();
        });
      };
      const grewHorizontally = oldCanvasW > 0 && canvasW > oldCanvasW;
      if (grewHorizontally) {
        glCssUnlockTimeoutRef.current = setTimeout(() => {
          glCssUnlockTimeoutRef.current = null;
          applyUnlockedSize();
        }, 80);
        waitForGlBackingStore();
      } else {
        applyUnlockedSize();
      }
    }
    updateMinimapAvailability();
    if (isMinimapVisible) r.renderMinimap(rect.width, rect.height, getMinimapDetailH());
  }, [getCanvasTargetSize, isMinimapVisible, getMinimapDetailH, updateMinimapAvailability, setCamera3DTransform, setCamera3DContainerStyle, debugGlOffsetX, debugGlOffsetY, debugRenderTuning, renderMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep manual debug offsets responsive even when no resize/layout event is
  // in flight. This updates both direct GL canvas placement and the Canvas2D
  // composited fallback path immediately when X/Y sliders or nudges change.
  useEffect(() => {
    const glEl = glCanvasRef.current;
    const rr = rendererRef.current;
    const totalGlOffsetY = (debugGlAutoOffsetY || 0) + (debugGlOffsetY || 0);
    const canvasW = rr?.canvasWidth || 0;
    const canvasH = rr?.canvasHeight || 0;
    const glCssSize = resolveLayerCssSize(
      canvasW,
      canvasH,
      debugRenderTuning?.glPercent,
      debugRenderTuning?.glManualActive === true,
      debugRenderTuning?.glManualW,
      debugRenderTuning?.glManualH,
    );
    if (glEl) {
      glEl.style.left = `${(canvasW - glCssSize.width) / 2 + (debugGlOffsetX || 0)}px`;
      glEl.style.top = `${(canvasH - glCssSize.height) / 2 + totalGlOffsetY}px`;
      glEl.style.right = 'auto';
      glEl.style.bottom = 'auto';
    }
    if (rr) {
      rr.render();
    }
  }, [debugGlOffsetX, debugGlOffsetY, debugGlAutoOffsetY, debugRenderTuning]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshCanvasLayout();
  }, [
    debugRenderTuning?.dprPercent,
    debugRenderTuning?.dprManualActive,
    debugRenderTuning?.dprManualValue,
    debugRenderTuning?.glPercent,
    debugRenderTuning?.glManualActive,
    debugRenderTuning?.glManualW,
    debugRenderTuning?.glManualH,
    debugRenderTuning?.overlayPercent,
    debugRenderTuning?.overlayManualActive,
    debugRenderTuning?.overlayManualW,
    debugRenderTuning?.overlayManualH,
    debugRenderTuning?.glyph2DPercent,
    debugRenderTuning?.glyph2DManualActive,
    debugRenderTuning?.glyph2DManualW,
    debugRenderTuning?.glyph2DManualH,
    debugRenderTuning?.glAaScale,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the GL canvas rotation up-to-date whenever the camera changes.
  // Previously the rotation lived in renderCanvasStyle (React state on the
  // wrapper div), so React re-renders kept it current. Now it is applied
  // imperatively to the canvas element, so we need an explicit effect.
  // The resize-lock translate (if any) is preserved by reading the current
  // transform and extracting the rotation part from camera3DTransformRef.
  useEffect(() => {
    const rotStr = usesWebGLTilt(renderMode)
      ? ''
      : (camera3DTransform !== 'none' ? camera3DTransform : '');
    const lockTranslate = glCssLockStateRef.current?.translateTransform || '';
    const glEl = glCanvasRef.current;
    if (glEl) {
      glEl.style.transform = [rotStr, lockTranslate].filter(Boolean).join(' ');
    }
    // Keep glyph overlay in sync — same rotation, no translate offset.
    const glyphEl = glyphCanvasRef.current;
    if (glyphEl) {
      glyphEl.style.transform = rotStr;
    }
    const glyph2DEl = glyph2DCanvasRef.current;
    if (glyph2DEl) {
      glyph2DEl.style.transform = rotStr;
    }
  }, [camera3DTransform, renderMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Imperative DOM-listener path: apply the camera transform to the canvas
  // elements synchronously on every camera tick, bypassing React entirely.
  // This decouples visual rotation smoothness from React's render pipeline,
  // which is critical when the events panel is open and the visualizer tree
  // is large enough that per-frame React reconciliation drops FPS.
  // The React-state-driven effect above remains as a safety net so the
  // transform stays consistent across remounts/HMR/snapshot restores.
  useEffect(() => {
    if (!addCameraDomListener) return;
    return addCameraDomListener((cam) => {
      const rotStr = usesWebGLTilt(renderModeRef.current)
        ? ''
        : (cam && cam.enabled ? cam.getCanvasTransform() : '');
      const lockTranslate = glCssLockStateRef.current?.translateTransform || '';
      const glEl = glCanvasRef.current;
      if (glEl) {
        glEl.style.transform = [rotStr, lockTranslate].filter(Boolean).join(' ');
      }
      const glyphEl = glyphCanvasRef.current;
      if (glyphEl) glyphEl.style.transform = rotStr;
      const glyph2DEl = glyph2DCanvasRef.current;
      if (glyph2DEl) glyph2DEl.style.transform = rotStr;
    });
  }, [addCameraDomListener]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    getCanvasTargetSize,
    getCanvasPlaneMetrics,
    captureViewportAnchor,
    refreshCanvasLayout,
    forceGlRedraw,
  };
}
