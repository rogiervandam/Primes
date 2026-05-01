#pragma once
typedef uint64_t uint64v8_t  __attribute__ ((vector_size(64), aligned(cache_line_bytes)));
typedef uint64_t uint64v4_t  __attribute__ ((vector_size(32), aligned(cache_line_bytes)));
typedef uint64_t uint64v2_t  __attribute__ ((vector_size(16), aligned(cache_line_bytes)));
typedef uint32_t uint32v16_t __attribute__ ((vector_size(64), aligned(cache_line_bytes)));
typedef uint32_t uint32v8_t  __attribute__ ((vector_size(32), aligned(cache_line_bytes)));
typedef uint32_t uint32v4_t  __attribute__ ((vector_size(16), aligned(cache_line_bytes)));
typedef uint32_t uint32v2_t  __attribute__ ((vector_size( 8), aligned(cache_line_bytes)));
typedef uint16_t uint16v32_t __attribute__ ((vector_size(64), aligned(cache_line_bytes)));
typedef uint16_t uint16v16_t __attribute__ ((vector_size(32), aligned(cache_line_bytes)));
typedef uint16_t uint16v8_t  __attribute__ ((vector_size(16), aligned(cache_line_bytes)));
typedef uint16_t uint16v4_t  __attribute__ ((vector_size( 8), aligned(cache_line_bytes)));
typedef uint16_t uint16v2_t  __attribute__ ((vector_size( 4), aligned(cache_line_bytes)));
