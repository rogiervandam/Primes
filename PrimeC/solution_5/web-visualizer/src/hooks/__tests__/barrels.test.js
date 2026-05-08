import { describe, it, expect } from 'vitest';

describe('Hook Barrels', () => {
  it('all domain barrels export valid functions', async () => {
    const domains = [
      'rendering',
      'playback',
      'animation',
      'interactions',
      'ui_state',
      'camera_3d',
      'overlays',
      'data',
      'utils',
    ];

    for (const domain of domains) {
      const barrel = await import(`./../${domain}/index.js`);
      const exports = Object.keys(barrel);
      expect(exports.length).toBeGreaterThan(0);
      // All exports should be functions (hooks)
      exports.forEach((name) => {
        expect(typeof barrel[name]).toBe('function');
      });
    }
  });
});
