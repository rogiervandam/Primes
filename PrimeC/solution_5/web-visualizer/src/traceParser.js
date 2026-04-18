/**
 * Sieve Trace File Parser
 *
 * Parses .sievetrace JSON files produced by PrimeC solution_5 trace system.
 * Supports format versions 2 (legacy) and 3 (with rich metadata).
 * Also supports "dump" type: a single memory snapshot in hex or binary format.
 */

export function parseTrace(buffer) {
  let text;
  if (typeof buffer === 'string') {
    text = buffer;
  } else if (buffer instanceof ArrayBuffer) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else if (buffer.buffer instanceof ArrayBuffer) {
    text = new TextDecoder('utf-8').decode(buffer);
  } else {
    throw new Error('Invalid buffer type');
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    throw new Error('Invalid trace file: not valid JSON — ' + e.message);
  }

  if (!json.version || json.version < 2) {
    throw new Error(
      `Unsupported trace version: ${json.version}. Expected version >= 2.`
    );
  }

  // Handle memory dump format
  if (json.type === 'dump') {
    return parseDump(json);
  }

  const rawSteps = json.steps || [];

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: json.bit_count,
    maxNumber: json.max_number ?? json.sieve_size,
    stepCount: rawSteps.length,
  };

  const steps = rawSteps.map((s) => ({
    stepId: s.step,
    annotation: s.annotation || '',
    operation: s.operation || null,
    prime: s.prime ?? null,
    blockStart: s.block_start ?? null,
    blockStop: s.block_stop ?? null,
    factorStep: s.factor_step ?? null,
    changedBits: new Uint32Array(s.changed_bits || []),
    numChanged: (s.changed_bits || []).length,
  }));

  return { header, steps };
}

/**
 * Parse a memory dump format trace file.
 * Converts hex/binary data into a single step with all set bits.
 */
function parseDump(json) {
  const bitCount = json.bit_count;
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
  };

  const steps = [{
    stepId: 0,
    annotation: 'Memory dump',
    operation: 'dump',
    prime: null,
    blockStart: null,
    blockStop: null,
    factorStep: null,
    changedBits: new Uint32Array(setBits),
    numChanged: setBits.length,
  }];

  return { header, steps };
}
