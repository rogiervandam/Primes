import { describe, expect, it } from 'vitest';
import { candidateLogDirs, globToRegExp, parseArgs } from '../../../bin/docker-import.mjs';

describe('docker-import helpers', () => {
  it('parses generic container import arguments', () => {
    const parsed = parseArgs([
      '--container', 'rust-run',
      '--container-log-dir', '/app/log',
      '--visualizer', 'http://localhost:5173',
      '--no-upload',
    ]);

    expect(parsed.containers).toEqual(['rust-run']);
    expect(parsed.containerLogDirs).toEqual(['/app/log']);
    expect(parsed.visualizer).toBe('http://localhost:5173');
    expect(parsed.upload).toBe(false);
  });

  it('discovers log directories from explicit paths, labels, env, working dir, and defaults', () => {
    const dirs = candidateLogDirs({
      Config: {
        WorkingDir: '/workspace',
        Env: ['SIEVE_TRACE_DIR=/trace-out'],
        Labels: { 'org.primes.visualizer.log-dir': '/label-log' },
      },
    }, ['/explicit']);

    expect(dirs.slice(0, 4)).toEqual(['/explicit', '/label-log', '/trace-out', '/workspace/log']);
    expect(dirs).toContain('/app/log');
  });

  it('matches simple trace glob patterns', () => {
    const regex = globToRegExp('*_trace_*.sievetrace');
    expect(regex.test('123_rust_bit-rotate_trace_100.sievetrace')).toBe(true);
    expect(regex.test('123_rust_bit-rotate.log')).toBe(false);
  });
});