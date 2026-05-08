export class RenderStateController {
  constructor(host) {
    this.host = host;
  }

  initialize(bitCount, sieveSize) {
    const host = this.host;
    host.bitCount = bitCount;
    host.sieveSize = sieveSize;
    host.bitState = new Uint8Array(bitCount);
    host.changedBits = new Set();
    host.targetBits = new Set();
    host.targetHitCounts = new Map();
    host.repeatedChangedBits = new Set();
    host.focusStart = null;
    host.focusStop = null;
    host.maskWordBits = null;
    host.maskWriteOrderWords = new Uint32Array(0);
    host.maskWriteOrderSlots = new Uint8Array(0);
    host.maskWriteOrderEventIds = new Int32Array(0);
    host.maskSlotBits = [];
    host.maskGhostBits = new Set();
    host.showMaskWriteOverlay = true;
    host.searchOverlay.clear();
    host.lastAccessStep = new Int32Array(bitCount).fill(-1);
    host.clHitCount = null;
    host.clLastHitStep = null;
    host.clMaxHitCount = 0;
    host.animationFocusBits = new Set();
    host.bitMotionTrails = [];
    host.transparentBackground = false;
    host._frozenClPerVRow = 0;
  }

  applyState(bitState, changedBits, targetBits = null, targetHitCounts = null, focusRange = null, maskMetadata = null, highlightMetadata = null) {
    const host = this.host;
    host._stateDirty = true;
    host.bitState = bitState;
    host.changedBits = changedBits;
    host.targetBits = targetBits || new Set();
    host.targetHitCounts = targetHitCounts || new Map();
    host.repeatedChangedBits = highlightMetadata?.repeatedBits instanceof Set
      ? highlightMetadata.repeatedBits
      : new Set(highlightMetadata?.repeatedBits || []);
    host.focusStart = focusRange?.focusStart ?? null;
    host.focusStop = focusRange?.focusStop ?? null;
    host.maskWordBits = maskMetadata?.wordBits ?? null;
    host.maskWriteOrderWords = maskMetadata?.targetWords || new Uint32Array(0);
    host.maskWriteOrderSlots = maskMetadata?.targetSlots || new Uint8Array(0);
    host.maskWriteOrderEventIds = maskMetadata?.targetEventIds || new Int32Array(0);
    host.maskSlotBits = maskMetadata?.slotBits || [];
    host.maskSlotBitsPerEvent = maskMetadata?.slotBitsPerEvent ?? null;
    host.maskGhostBits = new Set();
    host.showMaskWriteOverlay = true;
    host.bitMotionTrails = [];
  }

  setMaskGhostBits(bits) {
    this.host.maskGhostBits = bits instanceof Set ? bits : new Set(bits || []);
    this.host._stateDirty = true;
  }

  isBitInFocusRange(globalBit) {
    const host = this.host;
    return host.focusStart != null
      && host.focusStop != null
      && globalBit >= host.focusStart
      && globalBit <= host.focusStop;
  }
}
