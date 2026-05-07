import { useEffect, useRef } from 'react';
import { SieveRenderer } from '../SieveRenderer';
import { BitGridGLWorker } from '../renderer/gl/BitGridGLWorker';
import { GlyphTextGLCore } from '../renderer/gl/GlyphTextGLCore';
import { GlyphTextCanvas2D } from '../renderer/canvas/GlyphTextCanvas2D';
import { usesWebGLTilt } from '../lib/renderModes';

function setGlyphOverlayVisibility(glGlyphCanvas, canvas2DGlyphCanvas, mode) {
  if (glGlyphCanvas) {
    const show = mode === 'gl';
    // Keep the canvas attached/composited across mode switches; toggling
    // display:none can leave stale presentation until another style mutation.
    glGlyphCanvas.style.display = 'block';
    glGlyphCanvas.style.visibility = show ? 'visible' : 'hidden';
    glGlyphCanvas.style.opacity = show ? '1' : '0';
  }
  if (canvas2DGlyphCanvas) {
    const show = mode === '2d';
    canvas2DGlyphCanvas.style.display = 'block';
    canvas2DGlyphCanvas.style.visibility = show ? 'visible' : 'hidden';
    canvas2DGlyphCanvas.style.opacity = show ? '1' : '0';
  }
}

function selectGlyphRendererForMode(glRenderer, workerGlyphMode, glGlyphRenderer, canvas2DGlyphRenderer, renderMode) {
  const isDirect = glRenderer ? glRenderer.isDirectMode() : String(renderMode || '').endsWith('-direct');
  // separate-text wins regardless of direct/worker mode (Modes 1,2,4,5,6,8)
  if (workerGlyphMode === 'separate-text') return canvas2DGlyphRenderer || glGlyphRenderer || null;
  // Direct mode uses the GL glyph renderer when not separate-text (Mode 3)
  if (isDirect) return glGlyphRenderer || canvas2DGlyphRenderer || null;
  // Worker + gl mode: glyph rendering is handled inside the GL worker (Mode 7)
  return null;
}

function applyGlyphAttachment(liveRenderer, glRenderer, glyphRenderer) {
  if (!liveRenderer) return;
  if (glyphRenderer) {
    liveRenderer.attachGlyphRenderer(glyphRenderer || null);
    return;
  }
  if (glRenderer) {
    liveRenderer.attachGLWorker(glRenderer);
  }
}

export function useRendererBootstrap({
  header,
  wheelDefinition,
  rendererRef,
  minimapCanvasRef,
  glyphCanvasRef,
  glyph2DCanvasRef,
  glyphRendererRef,
  glCanvasRef,
  glRendererRef,
  bitStateRef,
  setIsGlUnavailable,
  setGlDebugInfo,
  updateGlDebugInfo,
  pendingRenderRafRef,
  createCamera,
  disposeCamera,
  camera3DRef,
  setZoom,
  getMinimapDetailH,
  renderMode = 'mode3-direct',
  debugGlModeOverride = 'auto',
  debugWorkerGlyphMode = 'gl',
  renderModeRestartNonce = 0,
}) {
  const baseRenderRef = useRef(null);
  const glyphGLRendererRef = useRef(null);
  const glyphCanvas2DRendererRef = useRef(null);
  const modeFollowupRafRef = useRef(null);
  const renderModeRef = useRef(renderMode);
  renderModeRef.current = renderMode;
  const workerGlyphModeRef = useRef(
    debugWorkerGlyphMode === 'separate-text' ? 'separate-text' : 'gl'
  );

  const scheduleModeFollowupRender = (liveRenderer) => {
    if (!liveRenderer) return;
    if (modeFollowupRafRef.current != null) {
      cancelAnimationFrame(modeFollowupRafRef.current);
      modeFollowupRafRef.current = null;
    }
    modeFollowupRafRef.current = requestAnimationFrame(() => {
      modeFollowupRafRef.current = null;
      const renderer = rendererRef.current;
      if (!renderer || renderer !== liveRenderer) return;
      renderer._stateDirty = true;
      if (renderer.bitState && renderer.bitCount > 0) renderer.render();
    });
  };

  const renderAfterModeSwitch = (liveRenderer) => {
    if (!liveRenderer || !liveRenderer.bitState || liveRenderer.bitCount <= 0) return;

    liveRenderer._stateDirty = true;
    const firstSeq = liveRenderer.render();
    const gl = glRendererRef.current;

    // For worker/direct GL paths, wait until the first frame is actually
    // presented, then issue a guaranteed second frame to flush overlays.
    if (gl && typeof gl.waitForRender === 'function' && Number.isFinite(firstSeq) && firstSeq > 0) {
      gl.waitForRender(firstSeq, () => {
        const currentRenderer = rendererRef.current;
        const currentGL = glRendererRef.current;
        if (!currentRenderer || currentRenderer !== liveRenderer) return;
        if (currentGL && currentGL !== gl) return;
        scheduleModeFollowupRender(currentRenderer);
      });
      return;
    }

    // Fallback path (no GL yet): still schedule a follow-up frame.
    scheduleModeFollowupRender(liveRenderer);
  };

  useEffect(() => {
    const renderer = new SieveRenderer();
    rendererRef.current = renderer;
    baseRenderRef.current = renderer.render.bind(renderer);
    if (minimapCanvasRef.current) renderer.attachMinimapCanvas(minimapCanvasRef.current);

    if (glyphCanvasRef.current) {
      let glyphRenderer = glyphGLRendererRef.current;
      if (!glyphRenderer) {
        const nextGlyphRenderer = new GlyphTextGLCore();
        try {
          if (nextGlyphRenderer.init(glyphCanvasRef.current)) {
            glyphRenderer = nextGlyphRenderer;
            glyphGLRendererRef.current = glyphRenderer;
          } else {
            console.warn('[GlyphText] WebGL2 context unavailable - glyph text disabled.');
          }
        } catch (err) {
          console.error('[GlyphText] init failed:', err);
        }
      }
    } else {
      console.warn('[GlyphText] glyphCanvasRef is null at init time - glyph text disabled.');
    }

    if (glyph2DCanvasRef.current) {
      let glyph2DRenderer = glyphCanvas2DRendererRef.current;
      if (!glyph2DRenderer) {
        const nextGlyph2DRenderer = new GlyphTextCanvas2D();
        try {
          if (nextGlyph2DRenderer.init(glyph2DCanvasRef.current)) {
            glyph2DRenderer = nextGlyph2DRenderer;
            glyphCanvas2DRendererRef.current = glyph2DRenderer;
          } else {
            console.warn('[GlyphText2D] Canvas2D context unavailable - separate-text mode disabled.');
          }
        } catch (err) {
          console.error('[GlyphText2D] init failed:', err);
        }
      }
    } else {
      console.warn('[GlyphText2D] glyph2DCanvasRef is null at init time - separate-text mode disabled.');
    }

    renderer.storageModel = header.storageModel || 'half';
    renderer.wheelDefinition = wheelDefinition;
    renderer.init(header.bitCount, header.sieveSize);
    bitStateRef.current = new Uint8Array(header.bitCount);
    renderer.prefetchPrimeOverlay(() => {
      const liveRenderer = rendererRef.current;
      if (liveRenderer && liveRenderer.primeOverlay) liveRenderer.render();
    });

    renderer.render = () => {
      const liveRenderer = rendererRef.current;
      const glRenderer = glRendererRef.current;
      const baseRender = baseRenderRef.current;
      if (!liveRenderer) return;
      if (!glRenderer) {
        return baseRender ? baseRender() : undefined;
      }

      const cssW = liveRenderer.canvasWidth || 0;
      const cssH = liveRenderer.canvasHeight || 0;
      glRenderer.resize(cssW, cssH);
      if (liveRenderer._stateDirty !== false) {
        glRenderer.uploadState(liveRenderer);
        liveRenderer._stateDirty = false;
      }

      const px = Math.max(1, liveRenderer.pixelSize);
      const zoom = Math.max(0.01, liveRenderer.zoom || 1);
      const bitColors = liveRenderer._bitColors();
      const changed = liveRenderer._opColor();
      const cam = camera3DRef?.current;
      const glTiltActive = usesWebGLTilt(renderModeRef.current);
      // CSS rotateX and our shader's view-space Y axis use opposite sign
      // conventions; flip X tilt in shader modes so drag feels identical.
      const shaderTiltXDeg = glTiltActive && cam?.enabled ? -(cam.rotateX || 0) : 0;
      const renderParams = {
        panX: liveRenderer.panX || 0,
        panY: liveRenderer.panY || 0,
        cellSize: px * zoom,
        bgColor: liveRenderer.effectiveBackground,
        setColor: bitColors.set,
        clearedColor: bitColors.cleared,
        changedColor: changed,
        repeatedColor: [245, 158, 11],
        baseAlpha: Math.max(0.12, Math.min(1, liveRenderer.gridOpacity ?? 1)),
        enableGlTilt: glTiltActive,
        tiltXDeg: shaderTiltXDeg,
        tiltYDeg: glTiltActive && cam?.enabled ? (cam.rotateY || 0) : 0,
        perspective: glTiltActive && cam?.enabled ? (cam.perspective || 1500) : 1500,
        ...liveRenderer.glLayoutParams(),
      };

      // Sync the glyph GL renderer's tilt state so text is projected with
      // the same 3D perspective transform as the bit-grid shader.
      const glyphGLRend = glyphGLRendererRef.current;
      if (glyphGLRend && typeof glyphGLRend.setTilt === 'function') {
        glyphGLRend.setTilt(
          renderParams.tiltXDeg,
          renderParams.tiltYDeg,
          renderParams.perspective,
          renderParams.enableGlTilt ? 1 : 0,
        );
      }

      let renderSeq;
      if (liveRenderer._glyphBuf) {
        if (baseRender) baseRender();
        const glyphCmds = liveRenderer._pendingGlyphCmds;
        liveRenderer._pendingGlyphCmds = null;
        renderSeq = glRenderer.render(renderParams, glyphCmds);
      } else {
        renderSeq = glRenderer.render(renderParams);
        if (baseRender) baseRender();
      }

      updateGlDebugInfo(false);
      return renderSeq;
    };

    renderer.scheduleRender = () => {
      if (pendingRenderRafRef.current != null) {
        cancelAnimationFrame(pendingRenderRafRef.current);
      }
      pendingRenderRafRef.current = requestAnimationFrame(() => {
        pendingRenderRafRef.current = null;
        const liveRenderer = rendererRef.current;
        if (liveRenderer) liveRenderer.render();
      });
    };

    createCamera({
      onPanZoom: ({ panX, panY, zoom: nextZoom }) => {
        const liveRenderer = rendererRef.current;
        if (!liveRenderer) return;
        liveRenderer.panX = panX;
        liveRenderer.panY = panY;
        liveRenderer.zoom = nextZoom;
        setZoom(nextZoom);
        (liveRenderer.scheduleRender ?? liveRenderer.render).call(liveRenderer);
        liveRenderer.renderMinimap(liveRenderer.canvasWidth, liveRenderer.canvasHeight || 0, getMinimapDetailH());
      },
    });

    return () => {
      if (modeFollowupRafRef.current != null) {
        cancelAnimationFrame(modeFollowupRafRef.current);
        modeFollowupRafRef.current = null;
      }
      baseRenderRef.current = null;
      rendererRef.current = null;
      disposeCamera();
    };
  }, [
    header.bitCount,
    header.sieveSize,
    header.storageModel,
    wheelDefinition,
    rendererRef,
    minimapCanvasRef,
    glyphCanvasRef,
    glyph2DCanvasRef,
    glyphRendererRef,
    glRendererRef,
    bitStateRef,
    updateGlDebugInfo,
    pendingRenderRafRef,
    createCamera,
    disposeCamera,
    camera3DRef,
    setZoom,
    getMinimapDetailH,
  ]);

  useEffect(() => {
    workerGlyphModeRef.current =
      debugWorkerGlyphMode === 'separate-text' ? 'separate-text' : 'gl';
  }, [debugWorkerGlyphMode]);

  useEffect(() => {
    const liveRenderer = rendererRef.current;
    const gl = glRendererRef.current;
    if (!liveRenderer) return;

    const glGlyphRenderer = glyphGLRendererRef.current;
    const canvas2DGlyphRenderer = glyphCanvas2DRendererRef.current;
    const selectedGlyphRenderer = selectGlyphRendererForMode(
      gl,
      workerGlyphModeRef.current,
      glGlyphRenderer,
      canvas2DGlyphRenderer,
      renderMode,
    );

    glyphRendererRef.current = selectedGlyphRenderer;

    let visibilityMode = 'none';
    if ((gl && gl.isDirectMode()) || (!gl && String(renderMode || '').endsWith('-direct'))) {
      visibilityMode = selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl';
      setGlyphOverlayVisibility(
        glyphCanvasRef.current,
        glyph2DCanvasRef.current,
        visibilityMode,
      );
    } else if (workerGlyphModeRef.current === 'separate-text' && selectedGlyphRenderer) {
      visibilityMode = selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl';
      setGlyphOverlayVisibility(
        glyphCanvasRef.current,
        glyph2DCanvasRef.current,
        visibilityMode,
      );
    } else {
      setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, 'none');
    }

    applyGlyphAttachment(liveRenderer, gl, selectedGlyphRenderer);

    renderAfterModeSwitch(liveRenderer);
  }, [
    renderMode,
    debugWorkerGlyphMode,
    renderModeRestartNonce,
    rendererRef,
    glRendererRef,
    glyphRendererRef,
    glyphCanvasRef,
    glyph2DCanvasRef,
  ]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const glCanvas = glCanvasRef.current;
    if (!renderer) return undefined;

    if (!glCanvas) {
      setIsGlUnavailable(true);
      return undefined;
    }

    if (typeof window !== 'undefined') {
      const baseW = Math.max(window.innerWidth || 800, window.screen?.width || 0);
      const baseH = Math.max(window.innerHeight || 600, window.screen?.height || 0);
      const canvasW = Math.max(1, Math.round(baseW * 3.2));
      const canvasH = Math.max(1, Math.round(baseH * 3.2));
      glCanvas.style.width = `${canvasW}px`;
      glCanvas.style.height = `${canvasH}px`;
      void glCanvas.getBoundingClientRect();
    }

    let disposed = false;
    const gl = new BitGridGLWorker();
    if (!gl.attach(glCanvas, debugGlModeOverride)) {
      setIsGlUnavailable(true);
      setGlDebugInfo(gl.getDebugInfo());
      try { gl.dispose(); } catch { /* ignore */ }
      renderer.render();
      return undefined;
    }

    glRendererRef.current = gl;
    renderer._stateDirty = true;
    setIsGlUnavailable(false);
    setGlDebugInfo(gl.getDebugInfo());
    updateGlDebugInfo(true);
    gl.resizeForBitCount(header.bitCount);
    gl.whenReady(() => {
      if (disposed || glRendererRef.current !== gl) return;
      const liveRenderer = rendererRef.current;
      if (!liveRenderer) return;
      const glGlyphRenderer = glyphGLRendererRef.current;
      const canvas2DGlyphRenderer = glyphCanvas2DRendererRef.current;
      const selectedGlyphRenderer = selectGlyphRendererForMode(
        gl,
        workerGlyphModeRef.current,
        glGlyphRenderer,
        canvas2DGlyphRenderer,
      );
      glyphRendererRef.current = selectedGlyphRenderer;
      if (gl.isDirectMode()) {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl');
      } else if (workerGlyphModeRef.current === 'separate-text' && selectedGlyphRenderer) {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl');
      } else {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, 'none');
      }
      applyGlyphAttachment(liveRenderer, gl, selectedGlyphRenderer);
      setIsGlUnavailable(false);
      updateGlDebugInfo(true);
      renderAfterModeSwitch(liveRenderer);
    });

    return () => {
      disposed = true;
      if (pendingRenderRafRef.current != null) {
        cancelAnimationFrame(pendingRenderRafRef.current);
        pendingRenderRafRef.current = null;
      }
      if (glRendererRef.current === gl) {
        glRendererRef.current = null;
      }
      try { gl.dispose(); } catch { /* ignore */ }
    };
  }, [
    header.bitCount,
    rendererRef,
    glyphCanvasRef,
    glyph2DCanvasRef,
    glyphRendererRef,
    glCanvasRef,
    glRendererRef,
    setIsGlUnavailable,
    setGlDebugInfo,
    updateGlDebugInfo,
    pendingRenderRafRef,
    debugGlModeOverride,
    renderModeRestartNonce,
  ]);

  useEffect(() => {
    const liveRenderer = rendererRef.current;
    const glRenderer = glRendererRef.current;
    if (!liveRenderer || !glRenderer) return;

    const glyphMode = debugWorkerGlyphMode === 'separate-text' ? 'separate-text' : 'gl';
    workerGlyphModeRef.current = glyphMode;

    glRenderer.whenReady(() => {
      const currentRenderer = rendererRef.current;
      const currentGL = glRendererRef.current;
      if (!currentRenderer || !currentGL || currentGL !== glRenderer) return;
      const glGlyphRenderer = glyphGLRendererRef.current;
      const canvas2DGlyphRenderer = glyphCanvas2DRendererRef.current;
      const selectedGlyphRenderer = selectGlyphRendererForMode(
        currentGL,
        glyphMode,
        glGlyphRenderer,
        canvas2DGlyphRenderer,
      );
      glyphRendererRef.current = selectedGlyphRenderer;
      if (currentGL.isDirectMode()) {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl');
      } else if (glyphMode === 'separate-text' && selectedGlyphRenderer) {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, selectedGlyphRenderer === canvas2DGlyphRenderer ? '2d' : 'gl');
      } else {
        setGlyphOverlayVisibility(glyphCanvasRef.current, glyph2DCanvasRef.current, 'none');
      }
      applyGlyphAttachment(currentRenderer, currentGL, selectedGlyphRenderer);
      renderAfterModeSwitch(currentRenderer);
    });
  }, [
    debugWorkerGlyphMode,
    rendererRef,
    glyphCanvasRef,
    glyph2DCanvasRef,
    glyphRendererRef,
    glRendererRef,
  ]);
}