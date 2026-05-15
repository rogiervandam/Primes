/**
 * 3D camera system for the sieve visualizer.
 *
 * Manages perspective tilt and rotation of the 2D canvas plane in 3D space.
 * Provides smooth camera animations and focus-on-click navigation.
 */

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

export class Camera3D {
  constructor() {
    this.rotateX = 0;
    this.rotateY = 0;
    this.perspective = 1200;
    this.enabled = false;

    this._animFrame = null;
    this._animSequence = null;
    this._onUpdate = null;
    this._onPanZoom = null;
    this.maxTilt = 65;
  }

  setUpdateCallback(fn) { this._onUpdate = fn; }

  setPanZoomCallback(fn) { this._onPanZoom = fn; }

  enable() {
    this.enabled = true;
    this._notify();
  }

  disable() {
    this.cancelAllAnimations();
    this.enabled = false;
    this.rotateX = 0;
    this.rotateY = 0;
    this._notify();
  }

  getContainerStyle() {
    if (!this.enabled) return {};
    return {
      perspective: `${this.perspective}px`,
      perspectiveOrigin: '50% 50%',
    };
  }

  getCanvasTransform() {
    if (!this.enabled) return 'none';
    return `rotateX(${this.rotateX}deg) rotateY(${this.rotateY}deg)`;
  }

  rotate(deltaX, deltaY) {
    if (!this.enabled) return;
    const nextRotateY = clamp(this.rotateY + deltaX * 0.18, -this.maxTilt, this.maxTilt);
    const nextRotateX = clamp(this.rotateX - deltaY * 0.18, -this.maxTilt, this.maxTilt);
    this.rotateX = nextRotateX;
    this.rotateY = nextRotateY;
    this._notify();
  }

  orbit(direction) {
    if (!this.enabled) return;
    const delta = 8;
    switch (direction) {
      case 'left':
        return this.animateTo({ rotateY: this.rotateY - delta }, 160);
      case 'right':
        return this.animateTo({ rotateY: this.rotateY + delta }, 160);
      case 'up':
        return this.animateTo({ rotateX: this.rotateX - delta }, 160);
      case 'down':
        return this.animateTo({ rotateX: this.rotateX + delta }, 160);
      default:
        return Promise.resolve();
    }
  }

  resetFlat() {
    return this.animateTo({ rotateX: 0, rotateY: 0 }, 240);
  }

  animateTo(target, duration = 700) {
    const nextRotateX = clamp(target.rotateX ?? this.rotateX, -this.maxTilt, this.maxTilt);
    const nextRotateY = clamp(target.rotateY ?? this.rotateY, -this.maxTilt, this.maxTilt);
    const nextPerspective = Math.max(300, target.perspective ?? this.perspective);

    return this._animateSmooth({
      from: { rotateX: this.rotateX, rotateY: this.rotateY, perspective: this.perspective },
      to: { rotateX: nextRotateX, rotateY: nextRotateY, perspective: nextPerspective },
      duration,
      easing: easeInOutCubic,
      onTick: (value) => {
        this.rotateX = value.rotateX;
        this.rotateY = value.rotateY;
        this.perspective = value.perspective;
        this._notify();
      },
    });
  }

  flyTo(target, viewport, currentView, targetZoom, duration = 900) {
    const zoomLevel = Math.max(0.0001, targetZoom ?? currentView.zoom ?? 1);
    const content = this._contentFromScreen(target, currentView);
    const centerX = viewport.centerX ?? viewport.containerW / 2;
    const centerY = viewport.centerY ?? viewport.containerH / 2;
    const nextView = {
      panX: centerX - content.x * zoomLevel,
      panY: centerY - content.y * zoomLevel,
      zoom: zoomLevel,
    };

    return this._animateSmooth({
      from: {
        rotateX: this.rotateX,
        rotateY: this.rotateY,
        panX: currentView.panX,
        panY: currentView.panY,
        zoom: currentView.zoom,
      },
      to: {
        rotateX: clamp(this.rotateX, -this.maxTilt, this.maxTilt),
        rotateY: clamp(this.rotateY, -this.maxTilt, this.maxTilt),
        panX: nextView.panX,
        panY: nextView.panY,
        zoom: nextView.zoom,
      },
      duration,
      easing: easeOutQuart,
      onTick: (value) => {
        this.rotateX = value.rotateX;
        this.rotateY = value.rotateY;
        if (this._onPanZoom) {
          this._onPanZoom({ panX: value.panX, panY: value.panY, zoom: value.zoom });
        }
        this._notify();
      },
    }).then(() => nextView);
  }

  _animateSmooth({ from, to, duration, easing, onTick }) {
    this._cancelAnim();
    return new Promise((resolve) => {
      const keys = Object.keys(from);
      const startTime = performance.now();

      const tick = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, duration <= 0 ? 1 : elapsed / duration);
        const eased = easing(progress);
        const current = {};

        for (const key of keys) {
          current[key] = lerp(from[key], to[key], eased);
        }

        onTick(current);

        if (progress < 1) {
          this._animFrame = requestAnimationFrame(tick);
        } else {
          this._animFrame = null;
          resolve();
        }
      };

      this._animFrame = requestAnimationFrame(tick);
    });
  }

  _contentFromScreen(target, currentView) {
    const zoom = Math.max(0.0001, currentView.zoom || 1);
    return {
      x: ((target.canvasX ?? 0) - (currentView.panX || 0)) / zoom,
      y: ((target.canvasY ?? 0) - (currentView.panY || 0)) / zoom,
    };
  }

  screenToCanvas(screenX, screenY, containerW, containerH, offsetX = 0, offsetY = 0) {
    const localScreenX = screenX + offsetX;
    const localScreenY = screenY + offsetY;

    if (!this.enabled || (Math.abs(this.rotateX) < 0.01 && Math.abs(this.rotateY) < 0.01)) {
      return { x: localScreenX, y: localScreenY };
    }

    const cx = containerW / 2;
    const cy = containerH / 2;
    const sx = localScreenX - cx;
    const sy = localScreenY - cy;
    const eyeZ = this.perspective;

    const rdx = sx;
    const rdy = sy;
    const rdz = -eyeZ;

    const ax = this.rotateX * Math.PI / 180;
    const ay = this.rotateY * Math.PI / 180;

    const cosA = Math.cos(ax);
    const sinA = Math.sin(ax);
    const cosB = Math.cos(ay);
    const sinB = Math.sin(ay);

    const nx = sinB * cosA;
    const ny = -sinA;
    const nz = cosB * cosA;
    const nDotEye = nz * eyeZ;
    const nDotDir = nx * rdx + ny * rdy + nz * rdz;

    if (Math.abs(nDotDir) < 1e-10) {
      return { x: localScreenX, y: localScreenY };
    }

    const t = -nDotEye / nDotDir;
    const ix = t * rdx;
    const iy = t * rdy;
    const iz = eyeZ + t * rdz;

    const cosNA = Math.cos(-ax);
    const sinNA = Math.sin(-ax);
    const cosNB = Math.cos(-ay);
    const sinNB = Math.sin(-ay);

    const rx1 = cosNB * ix + sinNB * iz;
    const ry1 = iy;
    const rz1 = -sinNB * ix + cosNB * iz;

    const localX = rx1;
    const localY = cosNA * ry1 - sinNA * rz1;

    return { x: localX + cx, y: localY + cy };
  }

  canvasToScreen(canvasX, canvasY, containerW, containerH, offsetX = 0, offsetY = 0) {
    const localCanvasX = canvasX ?? 0;
    const localCanvasY = canvasY ?? 0;

    if (!this.enabled || (Math.abs(this.rotateX) < 0.01 && Math.abs(this.rotateY) < 0.01)) {
      return { x: localCanvasX - offsetX, y: localCanvasY - offsetY };
    }

    const cx = containerW / 2;
    const cy = containerH / 2;
    const lx = localCanvasX - cx;
    const ly = localCanvasY - cy;
    const eyeZ = this.perspective;

    const ax = this.rotateX * Math.PI / 180;
    const ay = this.rotateY * Math.PI / 180;

    const cosA = Math.cos(ax);
    const sinA = Math.sin(ax);
    const cosB = Math.cos(ay);
    const sinB = Math.sin(ay);

    const rx1 = lx;
    const ry1 = cosA * ly;
    const rz1 = sinA * ly;

    const ix = cosB * rx1 + sinB * rz1;
    const iy = ry1;
    const iz = -sinB * rx1 + cosB * rz1;
    const scale = eyeZ / Math.max(1e-6, eyeZ - iz);

    return {
      x: cx + ix * scale - offsetX,
      y: cy + iy * scale - offsetY,
    };
  }

  cancelAllAnimations() {
    this._cancelAnim();
    this._animSequence = null;
  }

  _cancelAnim() {
    if (this._animFrame) {
      cancelAnimationFrame(this._animFrame);
      this._animFrame = null;
    }
  }

  _notify() {
    if (this._onUpdate) this._onUpdate();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
