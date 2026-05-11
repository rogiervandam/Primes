export class RenderEngine {
  constructor(host) {
    this.host = host;
  }

  renderFrame() {
    const host = this.host;
    if (!host._measureCtx || !host.bitState || host.bitCount === 0) return;

    host._glyphFramePrimed = false;
    host._recordFrameTiming();

    const frame = host._buildFrameContext();

    const glCtx = host._glyphBuf || host._glyphCtx || null;
    if (glCtx) {
      const canvasDpr = Math.max(0.1, host.canvasDpr || 1);
      const snapDpr = Math.max(0.1, host.canvasSnapDpr || canvasDpr);
      const cw = host.canvasWidth || 0;
      const ch = host.canvasHeight || 0;
      glCtx.beginFrame(cw, ch, canvasDpr, true, snapDpr);
    }

    host._renderCachelineHeatOverlay();
    host._renderCachelineOutline();

    for (let visualRow = frame.startVRow; visualRow < frame.endVRow; visualRow++) {
      host._renderVisualRow(frame, visualRow);
    }

    if (host.showMaskWriteOverlay) {
      host.maskWriteOverlay.render(glCtx);
    }
    host.vectorTouchOrderOverlay.render(frame.ctx, glCtx);
    host.cachelineAnnotationsOverlay.render(frame.ctx, glCtx);
    host.searchOverlay.render(frame.cw, frame.ch, glCtx);

    if (glCtx) {
      if (host._glyphBuf) {
        host._pendingGlyphCmds = glCtx.endFrame();
      } else {
        glCtx.endFrame();
      }
      host._glyphFramePrimed = true;
    }
  }
}
