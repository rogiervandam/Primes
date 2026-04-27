/**
 * Memory dump trace parser.
 *
 * "Dump" trace files capture the final sieve state as a hex/binary blob
 * rather than a sequence of events. This module decodes the blob into the
 * single synthetic step the visualiser uses to display final-state runs.
 */

import {
  toNumberOr,
  firstDefined,
  collectTitleInfo,
  normalizeBitCountForStorage,
} from './parseUtils';
import {
  parseBenchmarkOutputLine,
  buildTracePresentation,
} from './headerParser';

/**
 * Parse a memory dump format trace file.
 * Converts hex/binary data into a single step with all set bits.
 */
export function parseDump(json) {
  const bitCount = normalizeBitCountForStorage(
    String(json.storage_model || 'half'),
    toNumberOr(json.bit_count, 0),
    toNumberOr(firstDefined(json.max_number, json.sieve_size), 0),
    toNumberOr(json.sieve_size, 0),
  );
  const data = json.data || '';
  const format = json.format || 'hex';

  // Decode data into bytes
  let bytes;
  if (format === 'hex') {
    const len = Math.floor(data.length / 2);
    bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(data.substr(i * 2, 2), 16);
    }
  } else if (format === 'binary') {
    const len = Math.ceil(data.length / 8);
    bytes = new Uint8Array(len);
    for (let i = 0; i < data.length; i++) {
      if (data[i] === '1') {
        bytes[Math.floor(i / 8)] |= (1 << (i % 8));
      }
    }
  } else {
    throw new Error(`Unsupported dump format: ${format}`);
  }

  // Extract all set bit indices
  const setBits = [];
  for (let byteIdx = 0; byteIdx < bytes.length; byteIdx++) {
    let b = bytes[byteIdx];
    for (let bit = 0; b; bit++, b >>= 1) {
      if (b & 1) {
        const idx = byteIdx * 8 + bit;
        if (idx < bitCount) setBits.push(idx);
      }
    }
  }

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: bitCount,
    maxNumber: json.max_number ?? json.sieve_size,
    stepCount: 1,
    type: 'dump',
    storageModel: json.storage_model || 'half',
    benchmarkSettings: firstDefined(json.benchmark_settings, json.settings, null),
  };

  Object.assign(header, buildTracePresentation(header, {
    title: firstDefined(json.title, json.trace_title, null),
    subtitle: firstDefined(json.subtitle, json.trace_subtitle, null),
    info: collectTitleInfo(firstDefined(json.title_info, json.info, json.details, null)),
    benchmark: parseBenchmarkOutputLine(firstDefined(json.benchmark_output, json.benchmark, null)),
  }));

  const steps = [{
    stepId: 0,
    annotation: 'Memory dump',
    operation: 'dump',
    prime: null,
    start: null,
    stop: null,
    factorStep: null,
    changedBits: new Uint32Array(setBits),
    numChanged: setBits.length,
  }];

  return { header, steps };
}
