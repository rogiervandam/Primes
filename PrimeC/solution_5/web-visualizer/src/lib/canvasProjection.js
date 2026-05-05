export function getProjectedCanvasMapper(canvasEl) {
  if (!canvasEl || typeof canvasEl.getBoxQuads !== 'function') return null;
  const quad = canvasEl.getBoxQuads()[0];
  if (!quad) return null;
  const width = canvasEl.offsetWidth || parseFloat(canvasEl.style.width || '') || 0;
  const height = canvasEl.offsetHeight || parseFloat(canvasEl.style.height || '') || 0;
  if (width <= 0 || height <= 0) return null;

  const p00 = quad.p1;
  const p10 = quad.p2;
  const p11 = quad.p3;
  const p01 = quad.p4;
  const dx1 = p10.x - p11.x;
  const dy1 = p10.y - p11.y;
  const dx2 = p01.x - p11.x;
  const dy2 = p01.y - p11.y;
  const dx3 = p00.x - p10.x + p11.x - p01.x;
  const dy3 = p00.y - p10.y + p11.y - p01.y;
  const denom = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denom) < 1e-6) return null;

  const g = (dx3 * dy2 - dx2 * dy3) / denom;
  const h = (dx1 * dy3 - dx3 * dy1) / denom;
  const a = p10.x - p00.x + g * p10.x;
  const b = p01.x - p00.x + h * p01.x;
  const c = p00.x;
  const d = p10.y - p00.y + g * p10.y;
  const e = p01.y - p00.y + h * p01.y;
  const f = p00.y;

  const toViewport = (canvasX, canvasY) => {
    const u = canvasX / width;
    const v = canvasY / height;
    const z = g * u + h * v + 1;
    if (Math.abs(z) < 1e-6) return null;
    return {
      x: (a * u + b * v + c) / z,
      y: (d * u + e * v + f) / z,
    };
  };

  const toCanvas = (clientX, clientY) => {
    const a1 = clientX * g - a;
    const b1 = clientX * h - b;
    const c1 = c - clientX;
    const a2 = clientY * g - d;
    const b2 = clientY * h - e;
    const c2 = f - clientY;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-6) return null;
    const u = (c1 * b2 - c2 * b1) / det;
    const v = (a1 * c2 - a2 * c1) / det;
    return {
      x: u * width,
      y: v * height,
    };
  };

  return { toViewport, toCanvas };
}

export function parseAppliedRotateAngles(transformStr) {
  if (!transformStr || transformStr === 'none') return { rotateX: 0, rotateY: 0 };
  const xMatch = /rotateX\((-?\d+(?:\.\d+)?)deg\)/.exec(transformStr);
  const yMatch = /rotateY\((-?\d+(?:\.\d+)?)deg\)/.exec(transformStr);
  return {
    rotateX: xMatch ? Number(xMatch[1]) : 0,
    rotateY: yMatch ? Number(yMatch[1]) : 0,
  };
}

export function computeSafeTiltDegrees(canvasHeight, perspective = 1500) {
  const h = Math.max(1, Number(canvasHeight) || 1);
  const p = Math.max(300, Number(perspective) || 1500);
  // Keep the near-edge perspective amplification bounded. z = sin(ax) * h/2.
  // Using z <= 0.55p caps top-edge scale to about 2.22x.
  const ratio = Math.min(0.999, Math.max(0.01, (p * 0.55) / (h * 0.5)));
  const deg = Math.asin(ratio) * 180 / Math.PI;
  return Math.max(8, Math.min(65, deg));
}

export function computeAutoGlYOffset(cssHeight, effectiveDpr, rotateXDeg = 0, rotateYDeg = 0, cssWidth = 0) {
  const h = Math.max(1, Number(cssHeight) || 1);
  const w = Math.max(1, Number(cssWidth) || 1);
  const dpr = Math.max(0.1, Number(effectiveDpr) || 1);
  const rawDeficit = Math.max(0, 1 - dpr);
  // At true DPR=1 (or effectively equal after rounding), keep auto offset off.
  if (rawDeficit < 0.01) return 0;
  const ax = Math.abs(Number(rotateXDeg) || 0) * Math.PI / 180;
  const ay = Math.abs(Number(rotateYDeg) || 0) * Math.PI / 180;
  const xTiltStrength = Math.abs(Math.sin(ax));
  const yTiltStrength = Math.abs(Math.sin(ay));
  const tiltStrength = Math.min(1, Math.hypot(xTiltStrength, yTiltStrength));
  const xDominantTilt = Math.max(0, xTiltStrength - 0.7 * yTiltStrength);
  const yDominantTilt = Math.max(0, yTiltStrength - 0.8 * xTiltStrength);
  const balancedTilt = Math.max(0, tiltStrength - 1.15 * Math.abs(xTiltStrength - yTiltStrength));
  const highTilt = Math.max(0, tiltStrength - 0.45);
  const lowTiltGate = Math.max(0, Math.min(1, (0.46 - tiltStrength) / 0.16));
  // Keep the existing high-deficit behavior (subtracting the 0.08 dead-zone),
  // but add a tilt-weighted bridge for small deficits (e.g. dpr 0.95-0.99)
  // where Chromium still shows visible Y drift in direct mode.
  const deficitBase = Math.max(0, rawDeficit - 0.08);
  const deficitBridge = Math.max(0, 0.08 - rawDeficit) * tiltStrength * 0.9;
  const dprDeficit = deficitBase + deficitBridge;
  if (dprDeficit <= 0) return 0;
  // Calibrated from user measurements:
  // - 2D/high-width cases need a stronger base than the previous model
  // - modest tilt needs only a small bump
  // - medium tilt ramps quickly (Chromium compositor projection path)
  // A cap avoids over-correction for extreme rotations.
  const factorRaw = (
    0.66
    + 0.18 * tiltStrength
    // Recent calibration data shows that Y drift is materially larger when the
    // tilt is driven mostly by rotateX than when the same magnitude comes from
    // a balanced X/Y pair. Keep mixed-tilt behavior close to the prior model,
    // but raise X-dominant and Y-dominant cases independently.
    + 2.05 * xDominantTilt
    + 0.18 * yDominantTilt
    + 2.95 * tiltStrength * tiltStrength
    // New samples show high-deficit tilted cases can over-correct; damp tilt
    // response as raw DPR deficit grows so wide direct-mode scenes stay stable.
    - 1.6 * rawDeficit * tiltStrength
    // High mixed-tilt and high Y-dominant scenes in the mid-wide near-limit
    // band can still over-correct. Damp these corners without reducing
    // X-dominant high-tilt compensation too aggressively.
    - 10.5 * balancedTilt * highTilt
    - 1.35 * yDominantTilt * highTilt
    + 1.2 * xDominantTilt * highTilt
    // Broad mid-width near-limit under-correction persists in low/medium tilt
    // scenes. Lift these while keeping Y-dominant cases tempered.
    + 0.2 * lowTiltGate * (0.35 + 1.5 * xDominantTilt - 1.4 * yDominantTilt)
  );
  const factor = Math.min(1.32, Math.max(0.35, factorRaw));
  const basePx = h * dprDeficit * factor;
  // When DPR deficit is small but tilt is non-zero, Chromium can still exhibit
  // a noticeable residual Y shift. Add a bounded uplift in this corner only.
  const highDprTiltUplift = Math.max(0, (0.14 - rawDeficit) / 0.14);
  const upliftPx = h * tiltStrength * highDprTiltUplift * 0.15;
  // Residual trim from recent calibration pairs:
  // - high-deficit + no tilt tends to under-correct slightly
  // - high-deficit + tilt tends to over-correct slightly
  // Keep this term small and deficit-scaled so near-1 DPR behavior stays stable.
  const residualTrimPx = h * rawDeficit * (0.01 - 0.06 * tiltStrength);

  // Ultra-wide near-limit scenes can still need extra Y compensation even when
  // narrower canvases are already calibrated. Gate this term by width and
  // suppress at high tilt so previously matched wide-tilt cases stay stable.
  const widthGate = Math.max(0, Math.min(1, (w - 12500) / 1000));
  const mediumTilt = Math.max(0, Math.min(1, 1 - Math.abs(tiltStrength - 0.16) / 0.15));
  const mediumTiltDamp = 1 - Math.min(0.5, Math.max(0, (tiltStrength - 0.16) / 0.14));
  const highTiltGate = Math.max(0, Math.min(1, (0.32 - tiltStrength) / 0.12));
  const wideResidualFactor = Math.max(
    0,
    0.085
      + 0.06 * tiltStrength
      + 0.06 * mediumTilt
      - 0.9 * tiltStrength * tiltStrength,
  );
  const wideResidualPx = h
    * rawDeficit
    * wideResidualFactor
    * widthGate
    * mediumTiltDamp
    * highTiltGate;

  // Mid-wide scenes (~10k-12k CSS width) showed a separate under-correction
  // pattern after ultra-wide tuning. Use a dedicated gate so this band can be
  // corrected without pushing already-calibrated ultra-wide cases.
  const midWidthRampIn = Math.max(0, Math.min(1, (w - 9600) / 1300));
  const midWidthRampOut = Math.max(0, Math.min(1, (12150 - w) / 900));
  const midWidthGate = midWidthRampIn * midWidthRampOut;
  const midWidthTiltFactor = Math.max(
    0.04,
    0.29
      - 0.26 * tiltStrength
      + 0.2 * xDominantTilt
      - 0.1 * yDominantTilt
      - 0.12 * balancedTilt * highTilt,
  );
  const midWidthMediumTiltDamp = 1 - 0.35 * mediumTilt;
  const midWidthResidualPx = h
    * rawDeficit
    * midWidthGate
    * midWidthTiltFactor
    * midWidthMediumTiltDamp;

  // X-dominant tilt still shows a residual under-correction in the 10k-12k CSS
  // width band at effective DPRs around 0.75. Keep the term zero for balanced
  // mixed tilts so previously converged diagonal cases stay close.
  const midWidthAxisResidualPx = h
    * rawDeficit
    * midWidthGate
    * (0.42 * xDominantTilt - 0.02 * yDominantTilt - 0.15 * balancedTilt * highTilt);

  // Latest sweep indicates a broad under-correction in low/medium balanced
  // tilts (e.g. 12/12) while high balanced tilt (20/20) is already close.
  // Add lift only below the high-tilt shoulder so case 10 stays stable.
  const midWidthBalancedLowTiltBoostPx = h
    * rawDeficit
    * midWidthGate
    * balancedTilt
    * lowTiltGate
    * 0.56;

  return Math.round(
    basePx
      + upliftPx
      + residualTrimPx
      + wideResidualPx
      + midWidthResidualPx
      + midWidthAxisResidualPx
      + midWidthBalancedLowTiltBoostPx,
  );
}