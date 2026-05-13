/**
 * Animation rendering helpers extracted from SieveRenderer (item 408).
 *
 * All functions receive the SieveRenderer instance as their first argument `r`
 * so they can access renderer state without being class methods.
 *
 * Exported:
 *   drawMaskImprint  – shared helper used by renderMaskStamp and renderMaskHover
 *   drawCurvedTrail  – bezier trail used by renderMaskHover
 *   renderRipple     – contracting-ring animation on changed/focus bits
 *   renderFade       – fade-out overlay on changed bits
 *   renderPulse      – scale-up/down pulse on changed/focus bits
 *   renderMaskStamp  – moving stamp across mask write entries
 *   renderMaskHover  – flying mask-imprint preview animation
 */

// ── Shared drawing helpers ───────────────────────────────────────────────────

/**
 * Draw a mask imprint (outline + filled bit dots) around a mask entry.
 * @param {SieveRenderer} r
 */
export function drawMaskImprint(r, entry, x, y, options = {}, glCtx) {
  if (!entry || !glCtx) return;
  const px = r.pixelSize * r.zoom;
  const tint = r._maskTintColor(entry.slotIndex);
  const alpha = Math.max(0, Math.min(1, options.alpha ?? 1));
  const liftBlend = Math.max(0, Math.min(1, options.liftBlend ?? 0));
  const cutoutStrength = Math.max(0, Math.min(1, options.cutoutStrength ?? 0.72));
  const bounds = entry.bounds;
  const groupBounds = r._maskEntryGroupBounds(entry);
  const dx = x - bounds.cx;
  const dy = y - bounds.cy;
  const wordInset = r.maskWordBits && r.maskWordBits <= 32
    ? Math.max(0.8, Math.min(2.1, px * 0.18))
    : Math.max(1.2, Math.min(3.6, px * 0.34));

  const groupingBits = r._logicalGroupBits();
  const maskSizeBits = Number.isFinite(r.maskWordBits) && r.maskWordBits > 0
    ? r.maskWordBits
    : entry.count;
  const tr = tint[0] / 255, tg = tint[1] / 255, tb = tint[2] / 255;
  const bg = r.effectiveBackground;
  const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;

  if (groupBounds && groupingBits <= maskSizeBits) {
    glCtx.drawOutlineRect(
      groupBounds.x + dx - wordInset * 1.2,
      groupBounds.y + dy - wordInset * 1.2,
      groupBounds.w + wordInset * 2.4,
      groupBounds.h + wordInset * 2.4,
      tr, tg, tb, 0.92 * alpha,
      Math.max(1.2, px * 0.14),
    );
  }

  glCtx.drawFilledRect(
    bounds.x + dx - wordInset,
    bounds.y + dy - wordInset,
    bounds.w + wordInset * 2,
    bounds.h + wordInset * 2,
    tr, tg, tb, 0.16 * alpha,
  );
  glCtx.drawOutlineRect(
    bounds.x + dx - wordInset,
    bounds.y + dy - wordInset,
    bounds.w + wordInset * 2,
    bounds.h + wordInset * 2,
    tr, tg, tb, alpha,
    Math.max(1.2, px * 0.13),
  );

  const bits = r._maskEntryBits(entry);
  for (let index = 0; index < bits.length; index++) {
    const pos = r.bitIndexToCanvas(bits[index]);
    if (!pos) continue;
    const bx = pos.x - px / 2 + dx;
    const by = pos.y - px / 2 + dy;
    glCtx.drawFilledRect(bx, by, px, px, tr, tg, tb, 0.48 * alpha);
    if (cutoutStrength > 0) {
      const inset = Math.max(0.45, px * 0.22);
      const iw = Math.max(0.4, px - inset * 2);
      const ih = Math.max(0.4, px - inset * 2);
      glCtx.drawFilledRect(
        bx + inset, by + inset, iw, ih,
        br, bgc, bb,
        Math.max(0.12, 0.78 * alpha * cutoutStrength),
      );
    }
    glCtx.drawOutlineRect(bx, by, px, px, 1, 1, 1, 0.92 * alpha, Math.max(0.95, px * 0.11));
  }

  if (liftBlend > 0) {
    glCtx.drawFilledRect(
      bounds.x + dx - wordInset * 1.2,
      bounds.y + dy - wordInset * 1.2,
      bounds.w + wordInset * 2.4,
      bounds.h + wordInset * 2.4,
      1, 1, 1, 0.08 * alpha * liftBlend,
    );
  }
}

/**
 * Draw a bezier-curved dotted trail between two canvas positions.
 * @param {SieveRenderer} r
 */
export function drawCurvedTrail(r, fromX, fromY, toX, toY, color, alpha, px, travelLift, glCtx) {
  if (!glCtx) return;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.6 || alpha <= 0) return;

  const tr = color[0] / 255;
  const tg = color[1] / 255;
  const tb = color[2] / 255;
  const controlX = fromX + dx * 0.5;
  const lift = Math.max(px * 2.2, Math.min(distance * 0.24, travelLift * 0.95));
  const controlY = Math.min(fromY, toY) - lift;

  const lineRadius = Math.max(2.5, px * 0.18);
  const spacing = Math.max(0.35, lineRadius * 0.54);
  const samples = Math.max(20, Math.min(220, Math.ceil(distance / spacing)));
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const omt = 1 - u;
    const qx = omt * omt * fromX + 2 * omt * u * controlX + u * u * toX;
    const qy = omt * omt * fromY + 2 * omt * u * controlY + u * u * toY;
    const fade = 0.55 + 0.45 * u;
    glCtx.drawDot(qx, qy, lineRadius, tr, tg, tb, Math.max(0.04, alpha * fade));
  }
}

// ── Public animation rendering functions ────────────────────────────────────

/**
 * Render a contracting ripple overlay on changed / focus bits.
 * @param {SieveRenderer} r
 * @param {number} progress  0..1
 */
export function renderRipple(r, progress, focusBits = null, options = {}) {
  const sourceBits = focusBits && focusBits.size ? focusBits : r.animationFocusBits?.size ? r.animationFocusBits : r.changedBits;
  if (!sourceBits || sourceBits.size === 0) return;
  if (progress <= 0 || progress > 1) return;

  const cw = r.canvasWidth || 0;
  const ch = r.canvasHeight || 0;
  const px = r.pixelSize * r.zoom;
  const intensity = Math.max(0.4, Math.min(1.2, options.intensity || 1));

  const color = r._opColor();
  const ease = 1 - Math.pow(1 - progress, 3);
  const maxRadius = Math.max(8, px * 3.8 * intensity);
  const outerRadius = maxRadius * (1 - ease * 0.72);
  const innerRadius = Math.max(px * 0.55, outerRadius * 0.48);
  const coreRadius = Math.max(px * 0.36, px * (0.55 + 0.24 * (1 - progress)));
  const ringWidth = Math.max(0.8, 1.7 * intensity * (1 - ease * 0.45));
  const ringAlpha = Math.max(0, 0.5 * Math.pow(1 - progress, 0.72));
  const haloAlpha = Math.max(0, 0.1 * intensity * Math.pow(1 - progress, 1.18));
  const coreAlpha = Math.max(0, 0.6 * Math.pow(1 - progress, 0.56));
  const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

  const glCtx = r._beginGLAnim();
  if (!glCtx) return;

  for (const globalBit of sourceBits) {
    const pos = r.bitIndexToCanvas(globalBit);
    if (!pos) continue;
    const bitCx = pos.x;
    const bitCy = pos.y;

    if (bitCx + maxRadius < 0 || bitCx - maxRadius > cw || bitCy + maxRadius < 0 || bitCy - maxRadius > ch) continue;

    if (haloAlpha > 0.01) glCtx.drawDot(bitCx, bitCy, outerRadius, cr, cg, cb, haloAlpha);
    if (ringAlpha > 0.01) {
      glCtx.drawDot(bitCx, bitCy, innerRadius + ringWidth, cr, cg, cb, ringAlpha * 0.55);
      glCtx.drawDot(bitCx, bitCy, innerRadius, cr, cg, cb, ringAlpha);
    }
    if (coreAlpha > 0.01) glCtx.drawDot(bitCx, bitCy, coreRadius, cr, cg, cb, coreAlpha);
    if (options.showBeacon) {
      const beacon = Math.max(px * 0.9, 4.5 * intensity);
      glCtx.drawOutlineRect(bitCx - beacon / 2, bitCy - beacon / 2, beacon, beacon,
        1, 1, 1, Math.max(0.16, ringAlpha * 0.68), Math.max(0.75, px * 0.1));
    }
  }

  r._endGLAnim(glCtx);
}

/**
 * Fade animation: changed bits fade from transparent to full color.
 * @param {SieveRenderer} r
 * @param {number} progress  0..1
 */
export function renderFade(r, progress) {
  if (!r.changedBits || r.changedBits.size === 0) return;
  if (progress <= 0 || progress > 1) return;

  const px = r.pixelSize * r.zoom;
  const color = r._opColor();
  const alpha = 1 - progress;
  const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

  const glCtx = r._beginGLAnim();
  if (!glCtx) return;

  for (const globalBit of r.changedBits) {
    const pos = r.bitIndexToCanvas(globalBit);
    if (!pos) continue;
    glCtx.drawFilledRect(pos.x - px / 2 - 1, pos.y - px / 2 - 1, px + 2, px + 2, cr, cg, cb, alpha);
  }
  r._endGLAnim(glCtx);
}

/**
 * Pulse animation: changed / focus bits scale up then back down.
 * @param {SieveRenderer} r
 * @param {number} progress  0..1
 */
export function renderPulse(r, progress, focusBits = null, options = {}) {
  const sourceBits = focusBits && focusBits.size ? focusBits : r.animationFocusBits?.size ? r.animationFocusBits : r.changedBits;
  if (!sourceBits || sourceBits.size === 0) return;
  if (progress <= 0 || progress > 1) return;

  const px = r.pixelSize * r.zoom;
  const color = r._opColor();
  const intensity = Math.max(0.8, Math.min(1.8, options.intensity || 1));

  const peak = 0.3;
  const scale = progress < peak
    ? 1 + 1.15 * intensity * (progress / peak)
    : 1 + 1.15 * intensity * (1 - (progress - peak) / (1 - peak));
  const alpha = Math.max(0, progress < 0.75 ? 0.92 : 0.92 * (1 - (progress - 0.75) / 0.25));
  const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

  const glCtx = r._beginGLAnim();
  if (!glCtx) return;

  for (const globalBit of sourceBits) {
    const pos = r.bitIndexToCanvas(globalBit);
    if (!pos) continue;
    const s = px * scale;
    glCtx.drawFilledRect(pos.x - s / 2, pos.y - s / 2, s, s, cr, cg, cb, alpha);
    if (options.showHalo) {
      const hs = s * 1.36;
      glCtx.drawOutlineRect(pos.x - hs / 2, pos.y - hs / 2, hs, hs,
        1, 1, 1, Math.max(0.2, alpha * 0.72), Math.max(1.1, px * 0.15));
    }
  }

  r._endGLAnim(glCtx);
}

/**
 * Stamp animation for applyMask: a mask rectangle moves over each grouping
 * and lowers where bits are affected.
 * @param {SieveRenderer} r
 * @param {number} progress  0..1
 */
export function renderMaskStamp(r, progress) {
  if (!r.changedBits || r.changedBits.size === 0) return;
  const t = Math.max(0, Math.min(1, progress));

  const color = r._opColor();
  const px = r.pixelSize * r.zoom;
  const lift = Math.max(7, Math.min(18, px * 3.1));
  const cr = color[0] / 255, cg = color[1] / 255, cb = color[2] / 255;

  const orderedEntries = r._maskWriteEntries();
  const stampProgress = t * (orderedEntries.length > 0 ? orderedEntries.length : 0);

  const glCtx = r._beginGLAnim();
  if (!glCtx) return;

  if (orderedEntries.length > 0) {
    for (let i = 0; i < orderedEntries.length; i++) {
      const local = stampProgress - i;
      if (local < -0.25 || local > 1.2) continue;

      const phase = Math.max(0, Math.min(1, local));
      let yOffset;
      if (phase < 0.58) {
        yOffset = -lift * (1 - phase / 0.58);
      } else if (phase < 0.73) {
        yOffset = Math.sin(((phase - 0.58) / 0.15) * Math.PI) * 1.5;
      } else {
        yOffset = -4 * ((phase - 0.73) / 0.27);
      }

      const entry = orderedEntries[i];
      const tint = r._maskTintColor(entry.slotIndex);
      const bounds = entry.bounds;
      const groupBounds = r._maskEntryGroupBounds(entry);
      const groupingBits = r._logicalGroupBits();
      const maskSizeBits = Number.isFinite(r.maskWordBits) && r.maskWordBits > 0
        ? r.maskWordBits
        : entry.count;
      const stampBounds = (groupBounds && groupingBits <= maskSizeBits) ? groupBounds : bounds;
      const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
      const inset = Math.max(2, Math.min(6, px * 0.7));
      const stampPad = r.outlineEnabled ? Math.max(inset, r._outlinePadding()) : inset;
      const topExtra = r._labelBands().total;
      const rx = stampBounds.x - stampPad;
      const ry = stampBounds.y - stampPad - topExtra + yOffset;
      const rw = stampBounds.w + stampPad * 2;
      const rh = stampBounds.h + stampPad * 2 + topExtra;
      const ttr = tint[0] / 255, ttg = tint[1] / 255, ttb = tint[2] / 255;

      glCtx.drawFilledRect(rx, ry, rw, rh, ttr, ttg, ttb, alpha * 0.14);
      glCtx.drawOutlineRect(rx, ry, rw, rh, ttr, ttg, ttb, alpha, Math.max(0.8, Math.min(2.2, px * 0.11)));

      const bits = r._maskEntryBits(entry);
      const bg = r.effectiveBackground;
      const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;
      for (let bitIndex = 0; bitIndex < bits.length; bitIndex++) {
        const pos = r.bitIndexToCanvas(bits[bitIndex]);
        if (!pos) continue;
        const bx = pos.x - px / 2;
        const by = pos.y - px / 2 + yOffset;
        const cutInset = Math.max(0.45, px * 0.22);
        const cutW = Math.max(0.4, px - cutInset * 2);
        const cutH = Math.max(0.4, px - cutInset * 2);
        glCtx.drawFilledRect(bx, by, px, px, ttr, ttg, ttb, alpha * 0.36);
        glCtx.drawFilledRect(bx + cutInset, by + cutInset, cutW, cutH, br, bgc, bb, Math.max(0.16, alpha * 0.64));
        glCtx.drawOutlineRect(bx, by, px, px, 1, 1, 1, Math.max(0.2, alpha * 0.64), Math.max(0.7, px * 0.09));
      }
    }

    r._endGLAnim(glCtx);
    return;
  }

  const groupBits = r.customGroupingBits > 0 ? r.customGroupingBits : Math.max(1, r.vectorGroup * 64);
  const groupMap = new Map();
  for (const bit of r.changedBits) {
    const gid = Math.floor(bit / groupBits);
    const arr = groupMap.get(gid);
    if (arr) arr.push(bit);
    else groupMap.set(gid, [bit]);
  }
  const groups = Array.from(groupMap.keys()).sort((a, b) => a - b);
  if (groups.length === 0) {
    r._endGLAnim(glCtx);
    return;
  }

  const legacyStampProgress = t * groups.length;

  for (let i = 0; i < groups.length; i++) {
    const local = legacyStampProgress - i;
    if (local < -0.25 || local > 1.2) continue;

    const phase = Math.max(0, Math.min(1, local));
    let yOffset;
    if (phase < 0.58) {
      yOffset = -lift * (1 - phase / 0.58);
    } else if (phase < 0.73) {
      yOffset = Math.sin(((phase - 0.58) / 0.15) * Math.PI) * 1.5;
    } else {
      yOffset = -4 * ((phase - 0.73) / 0.27);
    }

    const gid = groups[i];
    const startBit = gid * groupBits;
    const count = Math.max(1, Math.min(groupBits, r.bitCount - startBit));
    if (count <= 0) continue;
    const bounds = r._multiBitBounds(startBit, count);
    if (!bounds) continue;

    const alpha = local < 0 ? Math.max(0, 0.28 + local * 1.1) : Math.max(0.22, 0.84 - phase * 0.42);
    const inset = Math.max(2, Math.min(6, px * 0.7));
    const rx = bounds.x - inset;
    const ry = bounds.y - inset + yOffset;
    const rw = bounds.w + inset * 2;
    const rh = bounds.h + inset * 2;

    glCtx.drawFilledRect(rx, ry, rw, rh, cr, cg, cb, alpha * 0.14);
    glCtx.drawOutlineRect(rx, ry, rw, rh, cr, cg, cb, alpha, Math.max(0.8, Math.min(2.2, px * 0.11)));

    const hitBits = groupMap.get(gid) || [];
    const markSize = Math.max(1.8, Math.min(6.2, px * 0.56));
    const bg = r.effectiveBackground;
    const br = bg[0] / 255, bgc = bg[1] / 255, bb = bg[2] / 255;
    for (let j = 0; j < hitBits.length; j++) {
      const pos = r.bitIndexToCanvas(hitBits[j]);
      if (!pos) continue;
      const bx = pos.x - markSize / 2;
      const by = pos.y - markSize / 2 + yOffset;
      glCtx.drawFilledRect(bx, by, markSize, markSize, cr, cg, cb, Math.max(0.26, alpha * 0.78));
      const cutInset = Math.max(0.35, markSize * 0.22);
      glCtx.drawFilledRect(
        bx + cutInset, by + cutInset,
        Math.max(0.3, markSize - cutInset * 2),
        Math.max(0.3, markSize - cutInset * 2),
        br, bgc, bb,
        Math.max(0.18, alpha * 0.65),
      );
      glCtx.drawOutlineRect(bx, by, markSize, markSize, 1, 1, 1, Math.max(0.2, alpha * 0.42), Math.max(0.45, Math.min(1.1, px * 0.07)));
    }
  }

  r._endGLAnim(glCtx);
}

/**
 * Flying mask-imprint preview: animates the mask pattern moving between write slots.
 * @param {SieveRenderer} r
 * @param {number} progress  0..1
 * @param {Array|null} precomputedSlotGroups
 */
export function renderMaskHover(r, progress, precomputedSlotGroups = null) {
  const slotGroups = precomputedSlotGroups || r._maskEntriesBySlot();
  if (slotGroups.length === 0) return;

  const px = r.pixelSize * r.zoom;
  const t = Math.max(0, Math.min(1, progress));
  const travelLift = Math.max(16, Math.min(52, px * 5.8));

  const glCtx = r._beginGLAnim();
  if (!glCtx) return;

  for (let groupIndex = 0; groupIndex < slotGroups.length; groupIndex++) {
    const entries = slotGroups[groupIndex];
    const segmentCount = Math.max(1, entries.length);
    const unit = t * segmentCount;
    const index = Math.min(entries.length - 1, Math.floor(unit));
    const local = Math.max(0, Math.min(1, unit - index));
    const from = entries[index];
    const to = entries[Math.min(entries.length - 1, index + 1)];

    // item 283: detect new mask (eventId changes) vs reused mask (same eventId).
    const prevEntry = index > 0 ? entries[index - 1] : null;
    const isNewMask = !prevEntry || (prevEntry.eventId !== from.eventId);
    const nextIsNewMask = from.eventId !== to.eventId;

    for (let previous = 0; previous < index; previous++) {
      const entryIsNew = previous === 0 || (entries[previous - 1].eventId !== entries[previous].eventId);
      drawMaskImprint(r, entries[previous], entries[previous].bounds.cx, entries[previous].bounds.cy, {
        alpha: entryIsNew ? 0.6 : 0.38,
      }, glCtx);
    }

    const rise = local < 0.35 ? local / 0.35 : local > 0.68 ? (1 - local) / 0.32 : 1;
    const smooth = local * local * (3 - 2 * local);
    const currentX = from.bounds.cx + (to.bounds.cx - from.bounds.cx) * smooth;
    const currentY = from.bounds.cy + (to.bounds.cy - from.bounds.cy) * smooth - travelLift * rise;
    const baseStampAlpha = isNewMask ? 1.0 : 0.72;
    const stampingAlpha = local < 0.18 ? baseStampAlpha : local > 0.82 ? baseStampAlpha : baseStampAlpha * 0.92;

    if (from !== to) {
      const tint = r._maskTintColor(from.slotIndex);
      const baseRouteAlpha = Math.max(0.40, stampingAlpha * 0.70);
      const routeAlpha = nextIsNewMask ? Math.min(1.0, baseRouteAlpha * 1.5) : baseRouteAlpha * 0.65;
      const trailTint = nextIsNewMask
        ? [255, 220, 80]  // gold/yellow for new mask trail
        : tint;            // slot tint for repeat trail
      drawCurvedTrail(r, from.bounds.cx, from.bounds.cy, to.bounds.cx, to.bounds.cy, trailTint, routeAlpha, px, travelLift, glCtx);
    }

    drawMaskImprint(r, from, currentX, currentY, {
      alpha: stampingAlpha,
      liftBlend: rise,
      cutoutStrength: 0.9,
    }, glCtx);

    // item 283: when arriving at a new mask, draw an extra glow ring to highlight the transition
    if (isNewMask && rise > 0.05) {
      const tint = r._maskTintColor(from.slotIndex);
      const tr = tint[0] / 255, tg = tint[1] / 255, tb = tint[2] / 255;
      const bounds = from.bounds;
      const dx = currentX - bounds.cx;
      const dy = currentY - bounds.cy;
      const glowPad = Math.max(4, px * 1.2) * rise;
      glCtx.drawOutlineRect(
        bounds.x + dx - glowPad,
        bounds.y + dy - glowPad,
        bounds.w + glowPad * 2,
        bounds.h + glowPad * 2,
        tr, tg, tb, 0.55 * stampingAlpha * rise,
        Math.max(2, px * 0.28),
      );
    }

    if (local > 0.78 && index < entries.length - 1) {
      drawMaskImprint(r, to, to.bounds.cx, to.bounds.cy, {
        alpha: (local - 0.78) / 0.22,
      }, glCtx);
    }
  }

  r._endGLAnim(glCtx);
}
