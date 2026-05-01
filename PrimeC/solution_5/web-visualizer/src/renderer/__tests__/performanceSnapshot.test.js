import { describe, it, expect } from 'vitest';
import { SieveRenderer } from '../../SieveRenderer.js';

describe('SieveRenderer performance snapshots', () => {
  it('reports recent frame timing samples in render order', () => {
    const renderer = new SieveRenderer();

    renderer._recordFrameTiming(1000);
    renderer._recordFrameTiming(1016);
    renderer._recordFrameTiming(1036);

    const snapshot = renderer.getPerformanceSnapshot();

    expect(snapshot.sampleCount).toBe(2);
    expect(snapshot.frameTimes).toEqual([16, 20]);
    expect(snapshot.avgMs).toBe(18);
    expect(snapshot.latestMs).toBe(20);
    expect(snapshot.maxMs).toBe(20);
    expect(snapshot.fps).toBe(56);
  });

  it('ignores idle gaps so the debug panel reflects active renders', () => {
    const renderer = new SieveRenderer();

    renderer._recordFrameTiming(1000);
    renderer._recordFrameTiming(2501);
    renderer._recordFrameTiming(2518);

    const snapshot = renderer.getPerformanceSnapshot();

    expect(snapshot.sampleCount).toBe(1);
    expect(snapshot.frameTimes).toEqual([17]);
    expect(snapshot.avgMs).toBe(17);
  });
});
