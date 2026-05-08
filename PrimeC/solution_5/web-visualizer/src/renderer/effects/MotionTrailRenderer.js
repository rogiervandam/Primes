export class MotionTrailRenderer {
  constructor(host) {
    this.host = host;
  }

  clear() {
    this.host.bitMotionTrails = [];
  }

  add(fromBit, toBit, options = {}) {
    if (!Number.isFinite(fromBit) || !Number.isFinite(toBit) || fromBit === toBit) return;
    const trails = this.host.bitMotionTrails;
    trails.push({
      fromBit,
      toBit,
      createdAt: performance.now(),
      duration: Math.max(180, Math.min(1200, options.duration || 420)),
      intensity: Math.max(0.8, Math.min(1.8, options.intensity || 1)),
    });
    if (trails.length > 18) {
      trails.splice(0, trails.length - 18);
    }
  }

  render(now = performance.now()) {
    const host = this.host;
    const trails = host.bitMotionTrails;
    if (!Array.isArray(trails) || trails.length === 0) return;

    const glCtx = host._beginGLAnim();
    if (!glCtx) return;

    const px = host.pixelSize * host.zoom;
    const color = host.getOperationHighlightColor();
    const cr = color[0] / 255;
    const cg = color[1] / 255;
    const cb = color[2] / 255;
    const alive = [];

    for (const trail of trails) {
      const age = now - trail.createdAt;
      const progress = Math.max(0, Math.min(1, age / Math.max(1, trail.duration)));
      if (progress >= 1) continue;

      const from = host.bitIndexToCanvas(trail.fromBit);
      const to = host.bitIndexToCanvas(trail.toBit);
      if (!from || !to) continue;

      alive.push(trail);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy);
      const lift = Math.max(px * 2.4, Math.min(distance * 0.18, px * 9));
      const alpha = Math.max(0, (1 - progress) * 0.72 * trail.intensity);
      const headAlpha = Math.max(0, (1 - progress) * 0.94);
      const controlX = from.x + dx * 0.5;
      const controlY = Math.min(from.y, to.y) - lift;

      const lineRadius = Math.max(1.35, px * 0.11 * (1 + trail.intensity * 0.35));
      const spacing = Math.max(0.35, lineRadius * 0.55);
      const samples = Math.max(18, Math.min(240, Math.ceil(distance / spacing)));
      for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const omt = 1 - t;
        const qx = omt * omt * from.x + 2 * omt * t * controlX + t * t * to.x;
        const qy = omt * omt * from.y + 2 * omt * t * controlY + t * t * to.y;
        const taper = 0.9 + 0.1 * (1 - t);
        glCtx.drawDot(qx, qy, lineRadius, cr, cg, cb, alpha * taper);
      }

      glCtx.drawDot(to.x, to.y, Math.max(1.2, px * 0.22), 1, 1, 1, headAlpha);
    }

    host._endGLAnim(glCtx);
    host.bitMotionTrails = alive;
  }
}
