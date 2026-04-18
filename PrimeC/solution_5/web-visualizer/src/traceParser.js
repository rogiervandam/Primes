/**
 * Sieve Trace File Parser
 *
 * Parses .sievetrace JSON files produced by PrimeC solution_5 trace system.
 * Supports format versions 2 (legacy) and 3 (with rich metadata).
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

  const rawSteps = json.steps || [];

  const header = {
    version: json.version,
    sieveSize: json.sieve_size,
    bitCount: json.bit_count,
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
