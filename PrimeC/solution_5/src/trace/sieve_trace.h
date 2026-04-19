#ifndef SIEVE_TRACE_H
#define SIEVE_TRACE_H

#include "sieve_trace_format.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <stdint.h>
#include <inttypes.h>
#include <time.h>
#include <sys/stat.h>
#include <sys/types.h>
#ifdef _WIN32
  #include <direct.h>
  #define trace_mkdir(path) _mkdir(path)
#else
  #define trace_mkdir(path) mkdir(path, 0755)
#endif

/*
 * Sieve Trace Recording API — JSON format v3
 *
 * Records changes to the bitstorage at each algorithmic step with rich metadata.
 * Uses snapshot-diff: after each operation, XOR with the snapshot reveals changed bits.
 * Output is a JSON file readable by the web/desktop visualizer.
 *
 * Compile with -DCOMPILE_TRACE to enable.
 */

typedef struct {
    FILE*     file;
    uint8_t*  snapshot;          /* Previous bitstorage state            */
    uint64_t  sieve_size;        /* Max number in sieve                  */
    uint64_t  bit_count;         /* Number of bits in bitstorage         */
    uint32_t  bitstorage_bytes;  /* Byte size of bitstorage              */
    uint32_t  step_count;        /* Steps recorded so far                */
    int       enabled;           /* 1 if actively recording              */
    /* Current analysis context (set by TRACE_ANALYSIS_START) */
    const char* current_operation;
    int64_t     current_block_start;
    int64_t     current_block_stop;
    int         depth;              /* Current analysis level (5-8)         */
    const char* prev_operations[16];
    int64_t     prev_block_starts[16];
    int64_t     prev_block_stops[16];
    int         prev_depths[16];    /* Stack of previous depth values       */
    int         depth_sp;           /* Stack pointer for context stack      */
} trace_context_t;

static trace_context_t g_trace = {0};
static char  g_trace_default_path[512] = {0};

/*
 * Generate a default trace filename under ./log/
 * Format: log/YYYY-MM-DD_HH-MM_<program_name>_<max_factor>.sievetrace
 */
static const char* __attribute__((cold))
trace_generate_default_filename(const char* program_name, uint64_t max_factor)
{
    trace_mkdir("log");

    time_t now = time(NULL);
    struct tm* t = localtime(&now);
    char timestamp[32];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d_%H-%M", t);

    const char* base = program_name;
    for (const char* p = program_name; *p; p++) {
        if (*p == '/' || *p == '\\') base = p + 1;
    }

    snprintf(g_trace_default_path, sizeof(g_trace_default_path),
             "log/%s_%s_%" PRIu64 ".sievetrace", timestamp, base, max_factor);
    return g_trace_default_path;
}

/* Write a JSON-escaped version of str to file */
static void
trace_write_json_string(FILE* f, const char* str)
{
    fputc('"', f);
    if (str) {
        for (const char* p = str; *p; p++) {
            switch (*p) {
                case '"':  fputs("\\\"", f); break;
                case '\\': fputs("\\\\", f); break;
                case '\n': fputs("\\n", f);  break;
                case '\r': fputs("\\r", f);  break;
                case '\t': fputs("\\t", f);  break;
                default:   fputc(*p, f);      break;
            }
        }
    }
    fputc('"', f);
}

static void
trace_write_json_i64_or_null(FILE* f, int64_t value)
{
    if (value >= 0) fprintf(f, "%lld", (long long)value);
    else fputs("null", f);
}

/* Set the current analysis context (called from TRACE_ANALYSIS_START macro) */
static void
trace_set_context(int level, const char* operation, int64_t block_start, int64_t block_stop)
{
    if (g_trace.depth_sp < 16) {
        g_trace.prev_operations[g_trace.depth_sp]   = g_trace.current_operation;
        g_trace.prev_block_starts[g_trace.depth_sp] = g_trace.current_block_start;
        g_trace.prev_block_stops[g_trace.depth_sp]  = g_trace.current_block_stop;
        g_trace.prev_depths[g_trace.depth_sp++] = g_trace.depth;
    }
    g_trace.depth               = level;
    g_trace.current_operation   = operation;
    g_trace.current_block_start = block_start;
    g_trace.current_block_stop  = block_stop;
}

/* Clear the analysis context (called from TRACE_ANALYSIS_END macro) */
static void
trace_clear_context(void)
{
    if (g_trace.depth_sp > 0) {
        g_trace.current_operation = g_trace.prev_operations[g_trace.depth_sp - 1];
        g_trace.current_block_start = g_trace.prev_block_starts[g_trace.depth_sp - 1];
        g_trace.current_block_stop = g_trace.prev_block_stops[g_trace.depth_sp - 1];
        g_trace.depth = g_trace.prev_depths[--g_trace.depth_sp];
    } else {
        g_trace.current_operation   = NULL;
        g_trace.current_block_start = -1;
        g_trace.current_block_stop  = -1;
        g_trace.depth = 0;
    }
}

/* Initialize the trace system. Opens the output file and writes JSON header. */
static void __attribute__((cold))
trace_init(const char* filename, uint64_t sieve_size, uint64_t bit_count)
{
    g_trace.sieve_size       = sieve_size;
    g_trace.bit_count        = bit_count;
    g_trace.bitstorage_bytes = (uint32_t)((bit_count + 7) / 8);
    g_trace.step_count       = 0;
    g_trace.enabled          = 0;
    g_trace.current_operation   = NULL;
    g_trace.current_block_start = -1;
    g_trace.current_block_stop  = -1;
    g_trace.depth               = 0;
    g_trace.depth_sp            = 0;

    g_trace.snapshot = (uint8_t*)calloc(1, g_trace.bitstorage_bytes);
    if (!g_trace.snapshot) {
        fprintf(stderr, "Trace: failed to allocate snapshot buffer (%u bytes)\n", g_trace.bitstorage_bytes);
        return;
    }

    g_trace.file = fopen(filename, "w");
    if (!g_trace.file) {
        fprintf(stderr, "Trace: failed to open output file: %s\n", filename);
        free(g_trace.snapshot);
        g_trace.snapshot = NULL;
        return;
    }

        fprintf(g_trace.file,
            "{\"version\":%d,\"sieve_size\":%llu,\"bit_count\":%llu,\"max_number\":%llu,\"steps\":[",
            TRACE_FORMAT_VERSION,
            (unsigned long long)sieve_size,
            (unsigned long long)bit_count,
            (unsigned long long)sieve_size);

    g_trace.enabled = 1;

    fprintf(stderr, "Trace: recording to %s (sieve_size=%llu, bits=%llu, %u bytes)\n",
            filename,
            (unsigned long long)sieve_size,
            (unsigned long long)bit_count,
            g_trace.bitstorage_bytes);
}

/*
 * Record one step with full metadata: diff current bitstorage against snapshot,
 * write changed bit indices as a JSON object, update snapshot.
 *
 * prime_number: the actual prime number (not bit index), or -1 if N/A
 * factor_step:  the step size used in marking, or -1 if N/A
 */
static void
trace_record_step_full(void* bitstorage, const char* annotation,
                       const char* operation, int64_t prime_number,
                       int64_t block_start, int64_t block_stop,
                       int64_t factor_step)
{
    if (!g_trace.enabled || !g_trace.file) return;

    const uint8_t* current = (const uint8_t*)bitstorage;
    const uint32_t step_id = g_trace.step_count++;

    if (step_id > 0) fputc(',', g_trace.file);

    fprintf(g_trace.file, "{\"step\":%u,\"annotation\":", step_id);
    trace_write_json_string(g_trace.file, annotation);
    fputs(",\"operation\":", g_trace.file);

    const char* op_name = operation ? operation : (g_trace.current_operation ? g_trace.current_operation : "unknown");
    trace_write_json_string(g_trace.file, op_name);

    /* Full operation path from context stack + current operation */
    fputs(",\"operation_path\":[", g_trace.file);
    int first_op = 1;
    for (int i = 0; i < g_trace.depth_sp; i++) {
        const char* op = g_trace.prev_operations[i];
        if (!op) continue;
        if (!first_op) fputc(',', g_trace.file);
        trace_write_json_string(g_trace.file, op);
        first_op = 0;
    }
    {
        const char* op = operation ? operation : g_trace.current_operation;
        if (op) {
            if (!first_op) fputc(',', g_trace.file);
            trace_write_json_string(g_trace.file, op);
            first_op = 0;
        }
    }
    if (first_op) {
        trace_write_json_string(g_trace.file, "unknown");
    }
    fputc(']', g_trace.file);

    /* Block range — use explicit params if provided, else fall back to context */
    int64_t bs = block_start >= 0 ? block_start : g_trace.current_block_start;
    int64_t be = block_stop >= 0 ? block_stop : g_trace.current_block_stop;

    fputs(",\"prime\":", g_trace.file);
    trace_write_json_i64_or_null(g_trace.file, prime_number);
    fputs(",\"block_start\":", g_trace.file);
    trace_write_json_i64_or_null(g_trace.file, bs);
    fputs(",\"block_stop\":", g_trace.file);
    trace_write_json_i64_or_null(g_trace.file, be);
    fputs(",\"factor_step\":", g_trace.file);
    trace_write_json_i64_or_null(g_trace.file, factor_step);
    fprintf(g_trace.file, ",\"depth\":%d,\"changed_bits\":[", g_trace.depth);

    int first = 1;
    for (uint32_t byte_idx = 0; byte_idx < g_trace.bitstorage_bytes; byte_idx++) {
        uint8_t diff = current[byte_idx] ^ g_trace.snapshot[byte_idx];
        for (uint32_t bit = 0; diff; bit++, diff >>= 1) {
            if (diff & 1) {
                uint32_t bit_index = byte_idx * 8 + bit;
                if (!first) fputc(',', g_trace.file);
                fprintf(g_trace.file, "%u", bit_index);
                first = 0;
            }
        }
    }

    fputs("]}", g_trace.file);

    memcpy(g_trace.snapshot, current, g_trace.bitstorage_bytes);
}

/*
 * Simple step recording (backward-compatible convenience).
 */
static void
trace_record_step(void* bitstorage, const char* annotation)
{
    trace_record_step_full(bitstorage, annotation, NULL, -1, -1, -1, -1);
}

/*
 * Record a step with printf-style annotation and full metadata.
 */
static void
trace_record_step_meta(void* bitstorage, const char* operation,
                       int64_t prime_number, int64_t block_start,
                       int64_t block_stop, int64_t factor_step,
                       const char* fmt, ...)
{
    if (!g_trace.enabled) return;

    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    trace_record_step_full(bitstorage, annotation, operation,
                           prime_number, block_start, block_stop, factor_step);
}

/*
 * Convenience: record a step with a printf-style annotation (no extra metadata).
 */
static void
trace_record_step_fmt(void* bitstorage, const char* fmt, ...)
{
    if (!g_trace.enabled) return;

    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    trace_record_step_full(bitstorage, annotation, NULL, -1, -1, -1, -1);
}

/*
 * Write a standalone memory dump file (no step-by-step changes).
 * Format: { "version": 3, "type": "dump", "sieve_size": N, "bit_count": N,
 *           "max_number": N, "format": "hex", "data": "<hex>" }
 */
static void __attribute__((cold))
trace_dump_memory(const char* filename, void* bitstorage,
                  uint64_t sieve_size, uint64_t bit_count)
{
    uint32_t bytes = (uint32_t)((bit_count + 7) / 8);
    const uint8_t* data = (const uint8_t*)bitstorage;

    trace_mkdir("log");

    FILE* f = fopen(filename, "w");
    if (!f) {
        fprintf(stderr, "Trace dump: failed to open %s\n", filename);
        return;
    }

    fprintf(f, "{\n");
    fprintf(f, "  \"version\": %d,\n", TRACE_FORMAT_VERSION);
    fprintf(f, "  \"type\": \"dump\",\n");
    fprintf(f, "  \"sieve_size\": %llu,\n", (unsigned long long)sieve_size);
    fprintf(f, "  \"bit_count\": %llu,\n", (unsigned long long)bit_count);
    fprintf(f, "  \"max_number\": %llu,\n", (unsigned long long)sieve_size);
    fprintf(f, "  \"format\": \"hex\",\n");
    fprintf(f, "  \"data\": \"");

    for (uint32_t i = 0; i < bytes; i++) {
        fprintf(f, "%02x", data[i]);
    }

    fprintf(f, "\"\n}\n");
    fclose(f);

    fprintf(stderr, "Trace dump: wrote %u bytes to %s\n", bytes, filename);
}

/*
 * Finalize the trace: close the JSON array and object, close file.
 */
static void __attribute__((cold))
trace_finalize(void)
{
    if (!g_trace.file) return;

    fputs("]}\n", g_trace.file);

    fclose(g_trace.file);
    g_trace.file = NULL;

    if (g_trace.snapshot) {
        free(g_trace.snapshot);
        g_trace.snapshot = NULL;
    }

    fprintf(stderr, "Trace: recorded %u steps\n", g_trace.step_count);

    g_trace.enabled = 0;
}

#endif /* SIEVE_TRACE_H */
