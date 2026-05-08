export class HeatMapStateController {
  constructor(host) {
    this.host = host;
  }

  ensureCachelineArrays() {
    const host = this.host;
    const numPhysicalCachelines = Math.max(1, Math.ceil(host.bitCount / (host.cachelineSize * 8)));
    if (!host.clHitCount || host.clHitCount.length !== numPhysicalCachelines) {
      host.clHitCount = new Int32Array(numPhysicalCachelines).fill(0);
      host.clLastHitStep = new Int32Array(numPhysicalCachelines).fill(-1);
      host.clMaxHitCount = 0;
    }
  }

  update(changedBits, stepIndex) {
    const host = this.host;
    if (!host.lastAccessStep) return;
    host.heatMapCurrentStep = stepIndex;
    const physicalBitsPerCacheline = host.cachelineSize * 8;
    this.ensureCachelineArrays();
    const touchedCachelines = new Set();
    for (const bit of changedBits) {
      if (bit < host.lastAccessStep.length) {
        host.lastAccessStep[bit] = stepIndex;
      }
      const cachelineIndex = Math.floor(bit / physicalBitsPerCacheline);
      touchedCachelines.add(cachelineIndex);
    }
    for (const cachelineIndex of touchedCachelines) {
      if (cachelineIndex < host.clHitCount.length) {
        host.clHitCount[cachelineIndex]++;
        host.clLastHitStep[cachelineIndex] = stepIndex;
        if (host.clHitCount[cachelineIndex] > host.clMaxHitCount) {
          host.clMaxHitCount = host.clHitCount[cachelineIndex];
        }
      }
    }
  }

  rebuild(steps, targetStep) {
    const host = this.host;
    if (!host.lastAccessStep) return;
    host.lastAccessStep.fill(-1);
    const physicalBitsPerCacheline = host.cachelineSize * 8;
    this.ensureCachelineArrays();
    host.clHitCount.fill(0);
    host.clLastHitStep.fill(-1);
    host.clMaxHitCount = 0;
    for (let i = 0; i <= targetStep && i < steps.length; i++) {
      const step = steps[i];
      const touchedCachelines = new Set();
      for (let j = 0; j < step.changedBits.length; j++) {
        const bit = step.changedBits[j];
        if (bit < host.lastAccessStep.length) {
          host.lastAccessStep[bit] = i;
        }
        const cachelineIndex = Math.floor(bit / physicalBitsPerCacheline);
        touchedCachelines.add(cachelineIndex);
      }
      for (const cachelineIndex of touchedCachelines) {
        if (cachelineIndex < host.clHitCount.length) {
          host.clHitCount[cachelineIndex]++;
          host.clLastHitStep[cachelineIndex] = i;
          if (host.clHitCount[cachelineIndex] > host.clMaxHitCount) {
            host.clMaxHitCount = host.clHitCount[cachelineIndex];
          }
        }
      }
    }
    host.heatMapCurrentStep = targetStep;
  }
}
