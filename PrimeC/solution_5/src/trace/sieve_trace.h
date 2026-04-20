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
    FILE*     json_file;
    uint8_t*  snapshot;          /* Previous bitstorage state            */
    uint64_t  sieve_size;        /* Max number in sieve                  */
    uint64_t  bit_count;         /* Number of bits in bitstorage         */
    uint32_t  bitstorage_bytes;  /* Byte size of bitstorage              */
    uint32_t  step_count;        /* Steps recorded so far                */
    int       enabled;           /* 1 if actively recording              */
    /* Current analysis nesting depth (set by TRACE_ANALYSIS_START) */
    int         depth;              /* Current analysis level (5-8)         */
    int         prev_depths[16];    /* Stack of previous depth values       */
    int         depth_sp;           /* Stack pointer for context stack      */
    int         json_enabled;
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

static const char*
trace_optional_label(const char* label)
{
    return (label && *label) ? label : NULL;
}

/* Set the current analysis context depth (called from TRACE_ANALYSIS_START macro) */
static void
primes_trace_set_context(int level)
{
    if (g_trace.depth_sp < 16) {
        g_trace.prev_depths[g_trace.depth_sp++] = g_trace.depth;
    }
    g_trace.depth = level;
}

/* Clear the analysis context (called from TRACE_ANALYSIS_END macro) */
static void
primes_trace_clear_context(void)
{
    if (g_trace.depth_sp > 0) {
        g_trace.depth = g_trace.prev_depths[--g_trace.depth_sp];
    } else {
        g_trace.depth = 0;
    }
}

/* Initialize the trace system. Opens the output file and writes JSON header. */
static void __attribute__((cold))
trace_init(const char* filename, uint64_t sieve_size, uint64_t bit_count, const char* benchmark_settings)
{
    const char* storage_model = getenv("TRACE_STORAGE_MODEL");
    if (!storage_model || !*storage_model) storage_model = "half";

    g_trace.sieve_size       = sieve_size;
    g_trace.bit_count        = bit_count;
    g_trace.bitstorage_bytes = (uint32_t)((bit_count + 7) / 8);
    g_trace.step_count       = 0;
    g_trace.enabled          = 0;
    g_trace.json_file        = NULL;
    g_trace.json_enabled     = 0;
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

    if (benchmark_settings && *benchmark_settings) {
        fprintf(g_trace.file,
                "TRACE version=%d format=text sieve_size=%llu bit_count=%llu max_number=%llu storage_model=%s benchmark_settings=%s\n",
                TRACE_FORMAT_VERSION,
                (unsigned long long)sieve_size,
                (unsigned long long)bit_count,
                (unsigned long long)sieve_size,
                storage_model,
                benchmark_settings);
    } else {
        fprintf(g_trace.file,
                "TRACE version=%d format=text sieve_size=%llu bit_count=%llu max_number=%llu storage_model=%s\n",
                TRACE_FORMAT_VERSION,
                (unsigned long long)sieve_size,
                (unsigned long long)bit_count,
                (unsigned long long)sieve_size,
                storage_model);
    }

    const char* json_secondary = getenv("TRACE_JSON_SECONDARY");
    if (json_secondary && strcmp(json_secondary, "0") != 0) {
        char json_path[1024];
        snprintf(json_path, sizeof(json_path), "%s.json", filename);
        g_trace.json_file = fopen(json_path, "w");
        if (g_trace.json_file) {
                if (benchmark_settings && *benchmark_settings) {
                    fprintf(g_trace.json_file,
                        "{\"version\":%d,\"sieve_size\":%llu,\"bit_count\":%llu,\"max_number\":%llu,\"storage_model\":\"%s\",\"benchmark_settings\":\"%s\",\"events\":[",
                        TRACE_FORMAT_VERSION,
                        (unsigned long long)sieve_size,
                        (unsigned long long)bit_count,
                        (unsigned long long)sieve_size,
                        storage_model,
                        benchmark_settings);
                } else {
                    fprintf(g_trace.json_file,
                        "{\"version\":%d,\"sieve_size\":%llu,\"bit_count\":%llu,\"max_number\":%llu,\"storage_model\":\"%s\",\"events\":[",
                        TRACE_FORMAT_VERSION,
                        (unsigned long long)sieve_size,
                        (unsigned long long)bit_count,
                        (unsigned long long)sieve_size,
                        storage_model);
                }
            g_trace.json_enabled = 1;
            fprintf(stderr, "Trace: JSON companion enabled: %s\n", json_path);
        } else {
            fprintf(stderr, "Trace: failed to open JSON companion file: %s\n", json_path);
        }
    }

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
trace_record_step_full(void* bitstorage, const char* annotation)
{
    if (!g_trace.enabled || !g_trace.file) return;

    const uint8_t* current = (const uint8_t*)bitstorage;
    const uint32_t step_id = g_trace.step_count++;

    /* Human-readable primary format: keep compact, omit empty/null metadata */
    fputs("EVENT", g_trace.file);
    if (g_trace.depth > 0) fprintf(g_trace.file, " depth=%d", g_trace.depth);

    uint32_t changed_count = 0;
    for (uint32_t byte_idx = 0; byte_idx < g_trace.bitstorage_bytes; byte_idx++) {
        uint8_t diff = current[byte_idx] ^ g_trace.snapshot[byte_idx];
        for (; diff; diff >>= 1) {
            if (diff & 1) changed_count++;
        }
    }

    fputs(" annotation=", g_trace.file);
    trace_write_json_string(g_trace.file, annotation ? annotation : "");

    fprintf(g_trace.file, " changed_count=%u changed_bits=[", changed_count);
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

    fputc(']', g_trace.file);
    fputc('\n', g_trace.file);

    /* Optional JSON companion output */
    if (g_trace.json_enabled && g_trace.json_file) {
        if (step_id > 0) fputc(',', g_trace.json_file);

        fputs("{\"annotation\":", g_trace.json_file);
        trace_write_json_string(g_trace.json_file, annotation ? annotation : "");
        fprintf(g_trace.json_file, ",\"depth\":%d,\"changed_bits\":[", g_trace.depth);

        first = 1;
        for (uint32_t byte_idx = 0; byte_idx < g_trace.bitstorage_bytes; byte_idx++) {
            uint8_t diff = current[byte_idx] ^ g_trace.snapshot[byte_idx];
            for (uint32_t bit = 0; diff; bit++, diff >>= 1) {
                if (diff & 1) {
                    uint32_t bit_index = byte_idx * 8 + bit;
                    if (!first) fputc(',', g_trace.json_file);
                    fprintf(g_trace.json_file, "%u", bit_index);
                    first = 0;
                }
            }
        }
        fputs("]}", g_trace.json_file);
    }

    memcpy(g_trace.snapshot, current, g_trace.bitstorage_bytes);
}

static void
trace_record_step_full_labeled(void* bitstorage, const char* annotation, const char* label)
{
    if (!g_trace.enabled || !g_trace.file) return;

    const uint8_t* current = (const uint8_t*)bitstorage;
    const uint32_t step_id = g_trace.step_count++;
    const char* event_label = trace_optional_label(label);

    fputs("EVENT", g_trace.file);
    if (g_trace.depth > 0) fprintf(g_trace.file, " depth=%d", g_trace.depth);
    if (event_label) {
        fputs(" function=", g_trace.file);
        trace_write_json_string(g_trace.file, event_label);
    }

    uint32_t changed_count = 0;
    for (uint32_t byte_idx = 0; byte_idx < g_trace.bitstorage_bytes; byte_idx++) {
        uint8_t diff = current[byte_idx] ^ g_trace.snapshot[byte_idx];
        for (; diff; diff >>= 1) {
            if (diff & 1) changed_count++;
        }
    }

    fputs(" annotation=", g_trace.file);
    trace_write_json_string(g_trace.file, annotation ? annotation : "");

    fprintf(g_trace.file, " changed_count=%u changed_bits=[", changed_count);
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

    fputc(']', g_trace.file);
    fputc('\n', g_trace.file);

    if (g_trace.json_enabled && g_trace.json_file) {
        if (step_id > 0) fputc(',', g_trace.json_file);

        fputs("{\"annotation\":", g_trace.json_file);
        trace_write_json_string(g_trace.json_file, annotation ? annotation : "");
        fprintf(g_trace.json_file, ",\"depth\":%d", g_trace.depth);
        if (event_label) {
            fputs(",\"function\":", g_trace.json_file);
            trace_write_json_string(g_trace.json_file, event_label);
        }
        fputs(",\"changed_bits\":[", g_trace.json_file);

        first = 1;
        for (uint32_t byte_idx = 0; byte_idx < g_trace.bitstorage_bytes; byte_idx++) {
            uint8_t diff = current[byte_idx] ^ g_trace.snapshot[byte_idx];
            for (uint32_t bit = 0; diff; bit++, diff >>= 1) {
                if (diff & 1) {
                    uint32_t bit_index = byte_idx * 8 + bit;
                    if (!first) fputc(',', g_trace.json_file);
                    fprintf(g_trace.json_file, "%u", bit_index);
                    first = 0;
                }
            }
        }
        fputs("]}", g_trace.json_file);
    }

    memcpy(g_trace.snapshot, current, g_trace.bitstorage_bytes);
}

static void
trace_record_text_full(const char* annotation, const char* label)
{
    if (!g_trace.enabled || !g_trace.file) return;

    const uint32_t step_id = g_trace.step_count++;
    const char* event_label = trace_optional_label(label);

    fputs("TEXT", g_trace.file);
    if (g_trace.depth > 0) fprintf(g_trace.file, " depth=%d", g_trace.depth);
    if (event_label) {
        fputs(" function=", g_trace.file);
        trace_write_json_string(g_trace.file, event_label);
    }
    fputs(" annotation=", g_trace.file);
    trace_write_json_string(g_trace.file, annotation ? annotation : "");
    fputc('\n', g_trace.file);

    if (g_trace.json_enabled && g_trace.json_file) {
        if (step_id > 0) fputc(',', g_trace.json_file);
        fputs("{\"type\":\"text\",\"annotation\":", g_trace.json_file);
        trace_write_json_string(g_trace.json_file, annotation ? annotation : "");
        fprintf(g_trace.json_file, ",\"depth\":%d", g_trace.depth);
        if (event_label) {
            fputs(",\"function\":", g_trace.json_file);
            trace_write_json_string(g_trace.json_file, event_label);
        }
        fputs(",\"changed_bits\":[]}", g_trace.json_file);
    }
}

/*
 * Simple step recording (backward-compatible convenience).
 */
static void
trace_record_step(void* bitstorage, const char* annotation)
{
    trace_record_step_full(bitstorage, annotation);
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

    trace_record_step_full(bitstorage, annotation);
}

static void
trace_record_step_labeled_fmt(void* bitstorage, const char* label, const char* fmt, ...)
{
    if (!g_trace.enabled) return;

    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    trace_record_step_full_labeled(bitstorage, annotation, label);
}

static void
trace_record_text_fmt(const char* fmt, ...)
{
    if (!g_trace.enabled) return;

    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    trace_record_text_full(annotation, NULL);
}

static void
trace_record_text_labeled_fmt(const char* label, const char* fmt, ...)
{
    if (!g_trace.enabled) return;

    char annotation[1024];
    va_list args;
    va_start(args, fmt);
    vsnprintf(annotation, sizeof(annotation), fmt, args);
    va_end(args);

    trace_record_text_full(annotation, label);
}

/*
 * Write a standalone memory dump file (no step-by-step changes).
 * Human-readable text dump is written as primary output.
 * JSON dump is optional secondary output when TRACE_JSON_SECONDARY=1.
 */
static void __attribute__((cold))
trace_dump_memory_with_format(const char* filename, void* bitstorage,
                              uint64_t sieve_size, uint64_t bit_count,
                              const char* format)
{
    uint32_t bytes = (uint32_t)((bit_count + 7) / 8);
    const uint8_t* data = (const uint8_t*)bitstorage;

    trace_mkdir("log");

    FILE* f = fopen(filename, "w");
    if (!f) {
        fprintf(stderr, "Trace dump: failed to open %s\n", filename);
        return;
    }

    const int binary = (format && strcmp(format, "binary") == 0);
    fprintf(f, "DUMP version=%d format=%s sieve_size=%llu bit_count=%llu max_number=%llu data=",
            TRACE_FORMAT_VERSION,
            binary ? "binary" : "hex",
            (unsigned long long)sieve_size,
            (unsigned long long)bit_count,
            (unsigned long long)sieve_size);

    if (binary) {
        for (uint32_t i = 0; i < bytes; i++) {
            for (int b = 0; b < 8; b++) {
                fputc((data[i] & (1u << b)) ? '1' : '0', f);
            }
        }
    } else {
        for (uint32_t i = 0; i < bytes; i++) {
            fprintf(f, "%02x", data[i]);
        }
    }
    fputc('\n', f);
    fclose(f);

    const char* json_secondary = getenv("TRACE_JSON_SECONDARY");
    if (json_secondary && strcmp(json_secondary, "0") != 0) {
        char json_path[1024];
        snprintf(json_path, sizeof(json_path), "%s.json", filename);
        FILE* jf = fopen(json_path, "w");
        if (jf) {
            fprintf(jf, "{\"version\":%d,\"type\":\"dump\",\"sieve_size\":%llu,\"bit_count\":%llu,\"max_number\":%llu,\"format\":\"%s\",\"data\":\"",
                    TRACE_FORMAT_VERSION,
                    (unsigned long long)sieve_size,
                    (unsigned long long)bit_count,
                    (unsigned long long)sieve_size,
                    binary ? "binary" : "hex");
            if (binary) {
                for (uint32_t i = 0; i < bytes; i++) {
                    for (int b = 0; b < 8; b++) {
                        fputc((data[i] & (1u << b)) ? '1' : '0', jf);
                    }
                }
            } else {
                for (uint32_t i = 0; i < bytes; i++) fprintf(jf, "%02x", data[i]);
            }
            fputs("\"}\n", jf);
            fclose(jf);
        }
    }

    fprintf(stderr, "Trace dump: wrote %u bytes to %s\n", bytes, filename);
}

static void __attribute__((cold))
trace_dump_memory(const char* filename, void* bitstorage,
                  uint64_t sieve_size, uint64_t bit_count)
{
    trace_dump_memory_with_format(filename, bitstorage, sieve_size, bit_count, "hex");
}

/*
 * Finalize the trace: close the JSON array and object, close file.
 */
static void __attribute__((cold))
trace_finalize(void)
{
    if (!g_trace.file) return;

    fclose(g_trace.file);
    g_trace.file = NULL;

    if (g_trace.json_enabled && g_trace.json_file) {
        fputs("]}\n", g_trace.json_file);
        fclose(g_trace.json_file);
        g_trace.json_file = NULL;
    }

    if (g_trace.snapshot) {
        free(g_trace.snapshot);
        g_trace.snapshot = NULL;
    }

    fprintf(stderr, "Trace: recorded %u events\n", g_trace.step_count);

    g_trace.enabled = 0;
}

#endif /* SIEVE_TRACE_H */
