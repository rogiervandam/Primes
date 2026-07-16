#pragma once
// #ifndef SIEVE_TRACE_H
// #define SIEVE_TRACE_H

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
#include <errno.h>
#ifdef _WIN32
  #include <direct.h>
  #define trace_mkdir(path) _mkdir(path)
#else
  #define trace_mkdir(path) mkdir(path, 0755)
#endif

static int
trace_ensure_log_directory_for_path(const char* filename)
{
        if (!filename || strncmp(filename, "log/", 4) != 0) return 1;

        struct stat st;
        if (stat("log", &st) == 0) return S_ISDIR(st.st_mode) ? 1 : 0;
        if (trace_mkdir("log") == 0) return 1;
        if (errno == EEXIST) return 1;
        return 0;
}

/*
 * Sieve Trace Recording API
 * Records changes to the bitstorage at each algorithmic step with rich metadata.
 * Uses snapshot-diff: after each operation, XOR with the snapshot reveals changed bits.
 * Output is a text file readable by the web/desktop visualizer.
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
    int         depth;              /* Current analysis level (5-8)         */
    int         prev_depths[16];    /* Stack of previous depth values       */
    int         depth_sp;           /* Stack pointer for context stack      */
    int         configured_trace_level;
} trace_context_t;

static trace_context_t trace = {0};
static char  trace_default_path[512] = {0};
static int   trace_console_feedback_enabled = 1;

#define TRACE_MAX_PENDING_TARGETS 65536
static uint32_t trace_pending_target_bits[TRACE_MAX_PENDING_TARGETS];
static int      trace_pending_target_count = 0;

static inline void
primes_trace_add_pending_target(uint32_t bit)
{
    if (trace_pending_target_count < TRACE_MAX_PENDING_TARGETS)
        trace_pending_target_bits[trace_pending_target_count++] = bit;
}

static inline void
trace_set_console_feedback(int enabled)
{
    trace_console_feedback_enabled = enabled;
}

/* Write a JSON key-value pair with an escaped string value: ` "key": "value"` (leading space included) */
static void
trace_write_json_string(FILE* f, const char* key, const char* str)
{
    fprintf(f, " \"%s\": \"", key);
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

static const char* trace_optional_label(const char* label) { return (label && *label) ? label : NULL; }

static inline void
primes_trace_append_mask_bit(char** bits_ptr, size_t* bits_remaining, char* bits_start, uintmax_t bit_index)
{
    if (*bits_remaining <= 1) return;

    const int written = snprintf(*bits_ptr, *bits_remaining, *bits_ptr == bits_start ? "%ju" : ",%ju", bit_index);

    if (written <= 0 || (size_t)written >= *bits_remaining) {
        (*bits_ptr)[*bits_remaining - 1] = '\0';
        *bits_remaining = 1;
        return;
    }

    *bits_ptr += written;
    *bits_remaining -= (size_t)written;
}

static inline void
primes_trace_format_mask_bits(char* bits, size_t bits_size, const void* mask, size_t lane_bytes, uint32_t lane_count, uint32_t lane_bits)
{
    char* bits_ptr = bits;
    size_t bits_remaining = bits_size;

    if (!bits || bits_size == 0 || !mask || lane_bytes == 0 || lane_bits == 0) return;

    bits[0] = '\0';

    for (uint32_t lane_index = 0; lane_index < lane_count && bits_remaining > 1; lane_index++) {
        uintmax_t lane_mask = 0;
        memcpy(&lane_mask, ((const uint8_t*)mask) + ((size_t)lane_index * lane_bytes), lane_bytes);

        for (uint32_t bit_offset = 0; bit_offset < lane_bits && bits_remaining > 1; bit_offset++) {
            if ((lane_mask & ((uintmax_t)1 << bit_offset)) == 0) continue;

            primes_trace_append_mask_bit(&bits_ptr, &bits_remaining, bits, (uintmax_t)lane_index * lane_bits + bit_offset);
        }
    }
}

static inline uint32_t
primes_trace_collect_mask_bits(uint32_t* out_bits, uint32_t out_capacity, const void* mask, size_t lane_bytes, uint32_t lane_count, uint32_t lane_bits)
{
    uint32_t out_count = 0;

    if (!mask || lane_bytes == 0 || lane_bits == 0) return 0;

    for (uint32_t lane_index = 0; lane_index < lane_count; lane_index++) {
        uintmax_t lane_mask = 0;
        memcpy(&lane_mask, ((const uint8_t*)mask) + ((size_t)lane_index * lane_bytes), lane_bytes);

        for (uint32_t bit_offset = 0; bit_offset < lane_bits; bit_offset++) {
            if ((lane_mask & ((uintmax_t)1 << bit_offset)) == 0) continue;
            if (out_bits && out_count < out_capacity) {
                out_bits[out_count] = lane_index * lane_bits + bit_offset;
            }
            out_count++;
        }
    }

    return out_count;
}

static void
trace_write_array_uint32(FILE* f, const char* key, const void* values_void, counter_t count)
{
    const uint32_t* values = (const uint32_t*)values_void;
    fprintf(f, ", \"%s\": []", key);
    for (counter_t index = 0; index < count; index++) {
        if (index > 0) fputc(',', f);
        fprintf(f, "%u", values[index]);
    }
    fputc(']', f);
}

static void
trace_write_array_uint64(FILE* f, const char* key, const void* values_void, counter_t count)
{
    const uint64_t* values = (const uint64_t*)values_void;
    fprintf(f, ", \"%s\": []", key);
    for (counter_t index = 0; index < count; index++) {
        if (index > 0) fputc(',', f);
        fprintf(f, "%llu", (unsigned long long)values[index]);
    }
    fputc(']', f);
}

static void
trace_write_wheel_definition(counter_t wheel_size,
                             counter_t bits_per_wheel,
                             counter_t base_size,
                             counter_t repeats,
                             counter_t wheel_max,
                             const counter_t* map_numbers,
                             counter_t map_count)
{
    if (!trace.enabled || !trace.file || !map_numbers || map_count == 0) return;

    fprintf(trace.file,
            "{ \"wheel_size\": %ju, \"bits_per_wheel\": %ju, \"base_size\": %ju, \"repeats\": %ju, \"wheel_max\": %ju, \"map_count\": %ju, ",
            (uintmax_t)wheel_size, (uintmax_t)bits_per_wheel,(uintmax_t)base_size,(uintmax_t)repeats,(uintmax_t)wheel_max, (uintmax_t)map_count);
    function(trace_write_array, counter_suffix)(trace.file, "map_numbers", map_numbers, map_count);
    fputs(", \"map_bits\": [", trace.file);
    for(counter_t index = 0; index < map_count; index++) { 
        if (index > 0) fputc(',', trace.file);
        fprintf(trace.file, "%ju", (uintmax_t)index);
    }
    fputs("] }\n", trace.file);
}

/* Set the current analysis context depth (called from TRACE_ANALYSIS_START macro) */
static void
primes_trace_set_context(int level)
{
    if (trace.depth_sp < 16) {
        trace.prev_depths[trace.depth_sp++] = trace.depth;
    }
    trace.depth = level-4; // TODO: check if this works
}

/* Clear the analysis context (called from TRACE_ANALYSIS_END macro) */
static void
primes_trace_clear_context(void)
{
    if (trace.depth_sp > 0) {
        trace.depth = trace.prev_depths[--trace.depth_sp];
    } else {
        trace.depth = 0;
    }
}

/* Initialize the trace system. Opens the output file and writes JSON header. */
static void __attribute__((cold))
trace_init(const char* filename, uint64_t sieve_size, uint64_t bit_count, int trace_level, const char* storage_model, const char* benchmark_settings, const char* trace_title, const char* trace_info)
{
    if (!storage_model || !*storage_model) storage_model = "half";

    trace.sieve_size       = sieve_size;
    trace.bit_count        = bit_count;
    trace.bitstorage_bytes = (uint32_t)((bit_count + 7) / 8);
    trace.step_count       = 0;
    trace.enabled          = 0;
    trace.depth               = 0;
    trace.depth_sp            = 0;
    trace.configured_trace_level = trace_level;

    trace.snapshot = (uint8_t*)calloc(1, trace.bitstorage_bytes);
    if (!trace.snapshot) {
        fprintf(stderr, "Trace: failed to allocate snapshot buffer (%u bytes)\n", trace.bitstorage_bytes);
        return;
    }

    if (!trace_ensure_log_directory_for_path(filename)) {
        fprintf(stderr, "Trace: failed to prepare log directory for output file: %s\n", filename);
        free(trace.snapshot);
        trace.snapshot = NULL;
        return;
    }

    trace.file = fopen(filename, "w");
    if (!trace.file) {
        fprintf(stderr, "Trace: failed to open output file: %s\n", filename);
        free(trace.snapshot);
        trace.snapshot = NULL;
        return;
    }

    if (benchmark_settings && *benchmark_settings) {
        fprintf(trace.file,
            "{ \"version\": %d, \"format\": \"text\", \"sieve_size\": %llu, \"bit_count\": %llu, \"max_number\": %llu, \"storage_model\": \"%s\", \"trace_level\": %d, \"benchmark_settings\": \"%s\" }\n",
                TRACE_FORMAT_VERSION, (unsigned long long)sieve_size, (unsigned long long)bit_count, (unsigned long long)sieve_size, storage_model, trace_level, benchmark_settings);
    } else {
        fprintf(trace.file,
            "{ \"version\": %d, \"format\": \"text\", \"sieve_size\": %llu, \"bit_count\": %llu, \"max_number\": %llu, \"storage_model\": \"%s\", \"trace_level\": %d }\n",
                TRACE_FORMAT_VERSION, (unsigned long long)sieve_size, (unsigned long long)bit_count, (unsigned long long)sieve_size, storage_model, trace_level);
    }

    if ((trace_title && *trace_title) || (trace_info && *trace_info)) {
        fputs("{", trace.file);
        int first_field = 1;
        if (trace_title && *trace_title) {
            trace_write_json_string(trace.file, "title", trace_title);
            first_field = 0;
        }
        if (trace_info && *trace_info) {
            if (!first_field) fputs(",", trace.file);
            trace_write_json_string(trace.file, "info", trace_info);
        }
        fputs(" }\n", trace.file);
    }

    /* Dedicated storage model line for downstream tooling to locate without parsing
       the primary TRACE header. Format: "StorageModel: <name>" */
    fprintf(trace.file, "StorageModel: %s", storage_model);

    trace.enabled = 1;

    if (trace_console_feedback_enabled) {
        fprintf(stderr, "Trace: recording to %s (sieve_size=%llu, bits=%llu, %u bytes)\n",
                filename, (unsigned long long)sieve_size, (unsigned long long)bit_count, trace.bitstorage_bytes);
    }
}

/* Write "changed_bits" JSON field: bit indices where current differs from snapshot. */
static void
trace_write_changed_bits(FILE* f, const uint8_t* current)
{
    fputs(", \"changed_bits\": [", f);
    int first = 1;
    for (uint32_t byte_idx = 0; byte_idx < trace.bitstorage_bytes; byte_idx++) {
        uint8_t diff = current[byte_idx] ^ trace.snapshot[byte_idx];
        for (uint32_t bit = 0; diff; bit++, diff >>= 1) {
            if (diff & 1) {
                uint64_t bit_index = (uint64_t)byte_idx * 8 + bit;
                if (!first) fputc(',', f);
                fprintf(f, "%llu", (unsigned long long)bit_index);
                first = 0;
            }
        }
    }
    fputc(']', f);
}

/* Write "target_bits" JSON field from the pending-targets list; clears the list. */
static void
trace_write_pending_target_bits(FILE* f)
{
    if (trace_pending_target_count <= 0) return;
    fputs(", \"target_bits\": [", f);
    for (int _k = 0; _k < trace_pending_target_count; _k++) {
        if (_k) fputc(',', f);
        fprintf(f, "%u", trace_pending_target_bits[_k]);
    }
    fputc(']', f);
    trace_pending_target_count = 0;
}

/* Write "target_bits" JSON field from mask_target_words + slot_bits. */
static void
trace_write_mask_target_bits(FILE* f,
                              counter_t word_bits,
                              counter_t mask_target_count,
                              counter_t slot_count,
                              const uint64_t* mask_target_words,
                              const uint32_t* mask_target_slots,
                              const uint32_t* const* slot_bits,
                              const uint32_t* slot_counts)
{
    if (word_bits == 0 || mask_target_count == 0 || slot_count == 0) return;
    fputs(", \"target_bits\": [", f);
    int tb_first = 1;
    for (counter_t ti = 0; ti < mask_target_count; ti++) {
        uint64_t wi = mask_target_words[ti];
        uint32_t si = (uint32_t)(mask_target_slots[ti] % (uint32_t)slot_count);
        const uint32_t* sbits = slot_bits[si];
        uint32_t scount = slot_counts[si];
        uint64_t base_bit = wi * (uint64_t)word_bits;
        for (uint32_t bi = 0; bi < scount; bi++) {
            if (!tb_first) fputc(',', f);
            fprintf(f, "%llu", (unsigned long long)(base_bit + sbits[bi]));
            tb_first = 0;
        }
    }
    fputc(']', f);
}

/* Write the common opening of a trace record: increment step_count, write the
   annotation prefix, open the JSON object, emit traceline/depth/level/operation.
   Returns 1 if trace is active, 0 if not (caller must return immediately). */
static int
trace_begin_record(int level, const char* label, const char* annotation)
{
    if (!trace.enabled || !trace.file) return 0;
    trace.step_count++;
    const char* event_label = trace_optional_label(label);
    fputs(annotation ? annotation : "", trace.file);
    fprintf(trace.file, " { \"traceline\": %u", trace.step_count);
    if (trace.depth > 0) fprintf(trace.file, ", \"depth\": %d", trace.depth);
    if (level > 0) fprintf(trace.file, ", \"level\": %d", level);
    if (event_label) {
        fputs(",", trace.file);
        trace_write_json_string(trace.file, "operation", event_label);
    }
    return 1;
}

/*
 * Record one step with full metadata: diff current bitstorage against snapshot,
 * write changed bit indices as a JSON object, update snapshot.
 *
 * prime_number: the actual prime number (not bit index), or -1 if N/A
 * factor_step:  the step size used in marking, or -1 if N/A
 */

static void
trace_record_event(int level, const uint8_t* bitstorage, const char* label, double time, const char* annotation)
{
    if (!trace_begin_record(level, label, annotation)) return;
    if (time > 0) fprintf(trace.file, ", \"time\": %.9f", time);
    trace_write_pending_target_bits(trace.file);
    trace_write_changed_bits(trace.file, bitstorage);
    fputs(" }\n", trace.file);

    memcpy(trace.snapshot, bitstorage, trace.bitstorage_bytes);
}

static void
trace_record_applymask(int level, const void* bitstorage,
                                    const char* label,
                                    const char* annotation,
                                    counter_t word_bits,
                                    counter_t word_start,
                                    counter_t word_stop,
                                    counter_t step_words,
                                    const uint32_t* const* slot_bits,
                                    const uint32_t* slot_counts,
                                    counter_t slot_count,
                                    const uint64_t* mask_target_words,
                                    const uint32_t* mask_target_slots,
                                    counter_t mask_target_count)
{
    static const char* s_pattern_kind_names[] = {"", "single", "pair", "triple", "quad"};

    const uint8_t* current = (const uint8_t*)bitstorage;
    const counter_t bit_start = word_start * word_bits;
    const counter_t bit_stop = (word_stop + 1) * word_bits - 1;
    const counter_t bit_step = step_words * word_bits;

    if (!trace_begin_record(level, label, annotation)) return;

    fprintf(trace.file,
            ", \"start\": %ju, \"stop\": %ju, \"step\": %ju"
            ", \"word_bits\": %ju, \"word_start\": %ju, \"word_stop\": %ju, \"step_words\": %ju",
            (uintmax_t)bit_start, (uintmax_t)bit_stop, (uintmax_t)bit_step,
            (uintmax_t)word_bits, (uintmax_t)word_start, (uintmax_t)word_stop, (uintmax_t)step_words);

    if (slot_count == 1) {
        trace_write_array_uint32(trace.file, "mask_bits", slot_bits[0], slot_counts[0]);
    }

    const char* pattern_kind = (slot_count >= 1 && slot_count <= 4) ? s_pattern_kind_names[slot_count] : "multi";
    fprintf(trace.file, ", \"pattern_kind\": \"%s\", \"pattern_slot_count\": %u", pattern_kind, slot_count);
    char slot_key[32];
    for (counter_t s = 0; s < slot_count; s++) {
        snprintf(slot_key, sizeof(slot_key), "pattern_slot%ju_bits", (uintmax_t)s);
        trace_write_array_uint32(trace.file, slot_key, slot_bits[s], slot_counts[s]);
    }
    trace_write_array_uint64(trace.file, "mask_target_words", mask_target_words, mask_target_count);
    trace_write_array_uint32(trace.file, "mask_target_slots", mask_target_slots, mask_target_count);

    trace_write_mask_target_bits(trace.file, word_bits, mask_target_count, slot_count,
                                  mask_target_words, mask_target_slots, slot_bits, slot_counts);
    trace_write_changed_bits(trace.file, current);
    fputs(" }\n", trace.file);

    memcpy(trace.snapshot, current, trace.bitstorage_bytes);
}

static void
trace_record_text(int level, const char* label, const char* annotation)
{
    if (!trace_begin_record(level, label, annotation)) return;
    fputs(" }\n", trace.file);
}

// Finalize the trace: close the JSON array and object, close file.
static void __attribute__((cold))
trace_finalize(void)
{
    trace.enabled = 0;

    if (!trace.file) return;
    fclose(trace.file); trace.file = NULL;

    if (trace.snapshot) {
        free(trace.snapshot); trace.snapshot = NULL;
    }

    if (trace_console_feedback_enabled) {
        fprintf(stderr, "Trace: recorded %u events\n", trace.step_count);
    }
}
