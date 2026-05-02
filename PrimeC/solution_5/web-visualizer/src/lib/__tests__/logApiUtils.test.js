import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  isSafeLogFileName,
  isUploadTraceFileName,
  saveUploadedTrace,
} from '../../../log-api-utils.mjs';

let tempDir = null;

afterEach(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
});

describe('log API utilities', () => {
  it('validates safe log file names', () => {
    expect(isSafeLogFileName('trace.sievetrace')).toBe(true);
    expect(isSafeLogFileName('../trace.sievetrace')).toBe(false);
    expect(isSafeLogFileName('nested/trace.sievetrace')).toBe(false);
    expect(isUploadTraceFileName('trace.txt')).toBe(false);
  });

  it('saves uploads with collision-safe names and queues them as pending', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sieve-log-api-'));
    const first = saveUploadedTrace(tempDir, 'trace.sievetrace', Buffer.from('TRACE version=7'));
    const second = saveUploadedTrace(tempDir, 'trace.sievetrace', Buffer.from('TRACE version=7'));

    expect(first.name).toBe('trace.sievetrace');
    expect(second.name).toBe('trace-1.sievetrace');
    expect(fs.existsSync(path.join(tempDir, first.name))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, second.name))).toBe(true);
  });
});