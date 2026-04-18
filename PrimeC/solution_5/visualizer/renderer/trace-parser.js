/**
 * Sieve Trace File Parser
 *
 * Parses .sievetrace JSON files produced by the PrimeC solution_5 trace system.
 * See src/trace/sieve_trace_format.h for the format specification.
 */

class TraceParser {
    /**
     * Parse a buffer (JSON text) into a trace object.
     * @param {ArrayBuffer|Buffer} buffer - The raw file bytes
     * @returns {{ header: Object, steps: Array }}
     */
    static parse(buffer) {
        // Convert buffer to string
        let text;
        if (typeof buffer === 'string') {
            text = buffer;
        } else if (buffer instanceof ArrayBuffer) {
            text = new TextDecoder('utf-8').decode(buffer);
        } else if (buffer.buffer && buffer.buffer instanceof ArrayBuffer) {
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
            throw new Error(`Unsupported trace version: ${json.version}. Expected version 2 (JSON format).`);
        }

        const sieveSize = json.sieve_size;
        const bitCount  = json.bit_count;
        const rawSteps  = json.steps || [];

        const header = {
            version:   json.version,
            sieveSize: sieveSize,
            bitCount:  bitCount,
            stepCount: rawSteps.length,
        };

        const steps = rawSteps.map((s) => ({
            stepId:      s.step,
            annotation:  s.annotation || '',
            changedBits: new Uint32Array(s.changed_bits || []),
            numChanged:  (s.changed_bits || []).length,
        }));

        return { header, steps };
    }
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.TraceParser = TraceParser;
}
