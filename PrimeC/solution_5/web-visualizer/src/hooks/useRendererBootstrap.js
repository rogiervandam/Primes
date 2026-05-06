import { useEffect } from 'react';
import { SieveRenderer } from '../SieveRenderer';
import { BitGridGLWorker } from '../renderer/gl/BitGridGLWorker';
import { GlyphTextGLCore } from '../renderer/gl/GlyphTextGLCore';

export function useRendererBootstrap({
  header,
  wheelDefinition,
  rendererRef,
  minimapCanvasRef,
  glyphCanvasRef,
  glyphRendererRef,
  glCanvasRef,
  glRendererRef,
  bitStateRef,
  setGlUnavailable,
  updateGlDebugInfo,
  pendingRenderRafRef,
  createCamera,
  disposeCamera,
  setZoom,
  getMinimapDetailH,
  setIntroPhase,
  introTiltStartedRef,
  setLoadingOverlayPhase,
  setUiChromeVisible,
  setOverlayBarPct,
  overlayStartTimeRef,
  pendingIntroAfterOverlayRef,
  loadingOverlayPhase,
  loadCompleteRef,
  loadProgressRef,
}) {
  useEffect(() => {
    const r = new SieveRenderer();
    rendererRef.current = r;
    if (minimapCanvasRef.current) r.attachMinimapCanvas(minimapCanvasRef.current);

    if (glyphCanvasRef.current) {
      let glr = glyphRendererRef.current;
      if (!glr) {
        const newGlr = new GlyphTextGLCore();
        try {
          if (newGlr.init(glyphCanvasRef.current)) {
            glr = newGlr;
            glyphRendererRef.current = glr;
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

    r.storageModel = header.storageModel || 'half';
    r.wheelDefinition = wheelDefinition;
    r.init(header.bitCount, header.sieveSize);
    bitStateRef.current = new Uint8Array(header.bitCount);
    r.prefetchPrimeOverlay(() => {
      const rr = rendererRef.current;
      if (rr && rr.primeOverlay) rr.render();
    });

    if (glCanvasRef.current) {
      let gl = glRendererRef.current;
      if (!gl) {
        if (typeof window !== 'undefined' && glCanvasRef.current) {
          const dpr = window.devicePixelRatio || 1;
          const baseW = Math.max(window.innerWidth || 800, window.screen?.width || 0);
          const baseH = Math.max(window.innerHeight || 600, window.screen?.height || 0);
          const canvasW = Math.max(1, Math.round(baseW * 3.2));
          const canvasH = Math.max(1, Math.round(baseH * 3.2));
          glCanvasRef.current.style.width = `${canvasW}px`;
          glCanvasRef.current.style.height = `${canvasH}px`;
          glCanvasRef.current.width = Math.round(canvasW * dpr);
          glCanvasRef.current.height = Math.round(canvasH * dpr);
          void glCanvasRef.current.getBoundingClientRect();
        }
        const newGl = new BitGridGLWorker();
        if (newGl.attach(glCanvasRef.current)) {
          gl = newGl;
          glRendererRef.current = gl;
          updateGlDebugInfo(true);
        } else {
          setGlUnavailable(true);
        }
      }
      if (gl) {
        gl.resizeForBitCount(header.bitCount);
        gl.whenReady(() => {
          const rr = rendererRef.current;
          if (!rr) return;
          if (gl.isDirectMode()) {
            const glrForDirect = glyphRendererRef.current;
            if (glrForDirect) rr.attachGlyphRenderer(glrForDirect);
          } else {
            rr.attachGLWorker(gl);
            if (rr.bitState && rr.bitCount > 0) rr.render();
          }
        });

        const origRender = r.render.bind(r);
        r.render = () => {
          const g = glRendererRef.current;
          const rr = rendererRef.current;
          if (!g || !rr) return;
          const cssW = rr.canvasWidth || 0;
          const cssH = rr.canvasHeight || 0;
          g.resize(cssW, cssH);
          if (rr._stateDirty !== false) {
            g.uploadState(rr);
            rr._stateDirty = false;
          }
          const px = Math.max(1, rr.pixelSize);
          const zoom = Math.max(0.01, rr.zoom || 1);
          const bitColors = rr._bitColors();
          const changed = rr._opColor();
          const renderParams = {
            panX: rr.panX || 0,
            panY: rr.panY || 0,
            cellSize: px * zoom,
            bgColor: rr.effectiveBackground,
            setColor: bitColors.set,
            clearedColor: bitColors.cleared,
            changedColor: changed,
            repeatedColor: [245, 158, 11],
            baseAlpha: Math.max(0.12, Math.min(1, rr.gridOpacity ?? 1)),
            ...rr.glLayoutParams(),
          };
          let renderSeq;
          if (rr._glyphBuf) {
            origRender();
            const glyphCmds = rr._pendingGlyphCmds;
            rr._pendingGlyphCmds = null;
            renderSeq = g.render(renderParams, glyphCmds);
          } else {
            renderSeq = g.render(renderParams);
            origRender();
          }
          updateGlDebugInfo(false);
          return renderSeq;
        };

        r.scheduleRender = () => {
          if (pendingRenderRafRef.current != null) {
            cancelAnimationFrame(pendingRenderRafRef.current);
          }
          pendingRenderRafRef.current = requestAnimationFrame(() => {
            pendingRenderRafRef.current = null;
            const rr = rendererRef.current;
            if (rr) rr.render();
          });
        };
      }
      if (!gl) {
        const glrFallback = glyphRendererRef.current;
        if (glrFallback) r.attachGlyphRenderer(glrFallback);
      }
    }

    createCamera({
      onPanZoom: ({ panX, panY, zoom: z }) => {
        const rr = rendererRef.current;
        if (!rr) return;
        rr.panX = panX;
        rr.panY = panY;
        rr.zoom = z;
        setZoom(z);
        (rr.scheduleRender ?? rr.render).call(rr);
        rr.renderMinimap(rr.canvasWidth, rr.canvasHeight || 0, getMinimapDetailH());
      },
    });

    return () => {
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
    glyphRendererRef,
    glCanvasRef,
    glRendererRef,
    bitStateRef,
    setGlUnavailable,
    updateGlDebugInfo,
    pendingRenderRafRef,
    createCamera,
    disposeCamera,
    setZoom,
    getMinimapDetailH,
  ]);

  useEffect(() => {
    let fired = false;
    const tryTrigger = () => {
      if (fired) return;
      const r = rendererRef.current;
      if (!r) return;
      fired = true;
      introTiltStartedRef.current = false;
      setIntroPhase('hidden');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setLoadingOverlayPhase('active');
          setUiChromeVisible(false);
          setOverlayBarPct(0);
          overlayStartTimeRef.current = Date.now();
          pendingIntroAfterOverlayRef.current = true;
        });
      });
    };
    const raf = requestAnimationFrame(tryTrigger);
    return () => cancelAnimationFrame(raf);
  }, [
    header.bitCount,
    rendererRef,
    introTiltStartedRef,
    setIntroPhase,
    setLoadingOverlayPhase,
    setUiChromeVisible,
    setOverlayBarPct,
    overlayStartTimeRef,
    pendingIntroAfterOverlayRef,
  ]);

  useEffect(() => {
    if (loadingOverlayPhase !== 'active') return;
    const MIN_MS = 2000;
    let timer = null;

    const update = () => {
      const elapsed = Date.now() - (overlayStartTimeRef.current || Date.now());
      const complete = loadCompleteRef.current;
      const progress = loadProgressRef.current;
      const stepCount = header.stepCount;

      const timePct = Math.min(100, (elapsed / MIN_MS) * 100);
      const realPct = complete ? 100
        : stepCount > 0 ? Math.min(95, (progress / stepCount) * 100)
        : Math.min(90, timePct * 0.9);
      const displayPct = Math.max(0, Math.min(timePct, realPct));
      setOverlayBarPct(Math.round(displayPct));

      if (complete && elapsed >= MIN_MS) {
        setOverlayBarPct(100);
        setTimeout(() => {
          setLoadingOverlayPhase('fading');
          setTimeout(() => {
            setLoadingOverlayPhase('hidden');
            setUiChromeVisible(true);
            if (pendingIntroAfterOverlayRef.current) {
              pendingIntroAfterOverlayRef.current = false;
              setIntroPhase('scaling');
            }
          }, 500);
        }, 300);
        return;
      }
      timer = setTimeout(update, 50);
    };

    timer = setTimeout(update, 50);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [
    loadingOverlayPhase,
    header.stepCount,
    overlayStartTimeRef,
    loadCompleteRef,
    loadProgressRef,
    setOverlayBarPct,
    setLoadingOverlayPhase,
    setUiChromeVisible,
    pendingIntroAfterOverlayRef,
    setIntroPhase,
  ]);
}