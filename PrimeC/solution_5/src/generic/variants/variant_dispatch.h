#ifndef PRIMES_VARIANT_DISPATCH_H
#define PRIMES_VARIANT_DISPATCH_H

// Sketch helpers for _Generic-based variant dispatch.
//
// Important:
// - _Generic can select between existing functions.
// - _Generic cannot replace the preprocessor-based code generation that builds
//   names like applyMask_index_uint32 or applyMask_index_uint64v4_unroll8.
// - If an API only takes void* storage, dispatch must use some other typed
//   argument, such as "mask", or a small typed wrapper around the storage.

#include "varianttypes.h"

// Map a typed expression to one function family.
//
// Use this when the function family only varies by the bitbucket type and you
// want a cleaner call site than function(name, suffix).
//
// Example:
//   PRIMES_DISPATCH_BY_MASK(mask,
//                           applyMask_index_uint8,
//                           applyMask_index_uint16,
//                           applyMask_index_uint32,
//                           applyMask_index_uint64,
//                           applyMask_index_uint16v2,
//                           applyMask_index_uint16v4,
//                           applyMask_index_uint16v8,
//                           applyMask_index_uint16v16,
//                           applyMask_index_uint16v32,
//                           applyMask_index_uint32v2,
//                           applyMask_index_uint32v4,
//                           applyMask_index_uint32v8,
//                           applyMask_index_uint32v16,
//                           applyMask_index_uint64v2,
//                           applyMask_index_uint64v4,
//                           applyMask_index_uint64v8)
#define PRIMES_DISPATCH_BY_MASK(expr, \
                                fn_u8, fn_u16, fn_u32, fn_u64, \
                                fn_u16v2, fn_u16v4, fn_u16v8, fn_u16v16, fn_u16v32, \
                                fn_u32v2, fn_u32v4, fn_u32v8, fn_u32v16, \
                                fn_u64v2, fn_u64v4, fn_u64v8) \
    _Generic((expr), \
        uint8_t: fn_u8, \
        uint16_t: fn_u16, \
        uint32_t: fn_u32, \
        uint64_t: fn_u64, \
        uint16v2_t: fn_u16v2, \
        uint16v4_t: fn_u16v4, \
        uint16v8_t: fn_u16v8, \
        uint16v16_t: fn_u16v16, \
        uint16v32_t: fn_u16v32, \
        uint32v2_t: fn_u32v2, \
        uint32v4_t: fn_u32v4, \
        uint32v8_t: fn_u32v8, \
        uint32v16_t: fn_u32v16, \
        uint64v2_t: fn_u64v2, \
        uint64v4_t: fn_u64v4, \
        uint64v8_t: fn_u64v8)

// Example convenience macro for one concrete family.
//
// This assumes you want the base variant names, not the _unroll4/_unroll8
// names. If you want to dispatch to unrolled variants too, make a second
// convenience macro and pass the explicit function names you want.
#define PRIMES_APPLYMASK_INDEX(mask, bitstorage, range_start_index, range_stop_index, step) \
    PRIMES_DISPATCH_BY_MASK((mask), \
                            applyMask_index_uint8, \
                            applyMask_index_uint16, \
                            applyMask_index_uint32, \
                            applyMask_index_uint64, \
                            applyMask_index_uint16v2, \
                            applyMask_index_uint16v4, \
                            applyMask_index_uint16v8, \
                            applyMask_index_uint16v16, \
                            applyMask_index_uint16v32, \
                            applyMask_index_uint32v2, \
                            applyMask_index_uint32v4, \
                            applyMask_index_uint32v8, \
                            applyMask_index_uint32v16, \
                            applyMask_index_uint64v2, \
                            applyMask_index_uint64v4, \
                            applyMask_index_uint64v8) \
    ((bitstorage), (range_start_index), (range_stop_index), (step), (mask))

// If void* makes dispatch awkward, wrap the storage in a typed view and
// dispatch on the wrapper type instead of a separate mask argument.
typedef struct { uint8_t* ptr; } primes_bitstorage_u8_view_t;
typedef struct { uint16_t* ptr; } primes_bitstorage_u16_view_t;
typedef struct { uint32_t* ptr; } primes_bitstorage_u32_view_t;
typedef struct { uint64_t* ptr; } primes_bitstorage_u64_view_t;
typedef struct { uint16v2_t* ptr; } primes_bitstorage_u16v2_view_t;
typedef struct { uint16v4_t* ptr; } primes_bitstorage_u16v4_view_t;
typedef struct { uint16v8_t* ptr; } primes_bitstorage_u16v8_view_t;
typedef struct { uint16v16_t* ptr; } primes_bitstorage_u16v16_view_t;
typedef struct { uint16v32_t* ptr; } primes_bitstorage_u16v32_view_t;
typedef struct { uint32v2_t* ptr; } primes_bitstorage_u32v2_view_t;
typedef struct { uint32v4_t* ptr; } primes_bitstorage_u32v4_view_t;
typedef struct { uint32v8_t* ptr; } primes_bitstorage_u32v8_view_t;
typedef struct { uint32v16_t* ptr; } primes_bitstorage_u32v16_view_t;
typedef struct { uint64v2_t* ptr; } primes_bitstorage_u64v2_view_t;
typedef struct { uint64v4_t* ptr; } primes_bitstorage_u64v4_view_t;
typedef struct { uint64v8_t* ptr; } primes_bitstorage_u64v8_view_t;

#define PRIMES_DISPATCH_BY_STORAGE_VIEW(view, \
                                        fn_u8, fn_u16, fn_u32, fn_u64, \
                                        fn_u16v2, fn_u16v4, fn_u16v8, fn_u16v16, fn_u16v32, \
                                        fn_u32v2, fn_u32v4, fn_u32v8, fn_u32v16, \
                                        fn_u64v2, fn_u64v4, fn_u64v8) \
    _Generic((view), \
        primes_bitstorage_u8_view_t: fn_u8, \
        primes_bitstorage_u16_view_t: fn_u16, \
        primes_bitstorage_u32_view_t: fn_u32, \
        primes_bitstorage_u64_view_t: fn_u64, \
        primes_bitstorage_u16v2_view_t: fn_u16v2, \
        primes_bitstorage_u16v4_view_t: fn_u16v4, \
        primes_bitstorage_u16v8_view_t: fn_u16v8, \
        primes_bitstorage_u16v16_view_t: fn_u16v16, \
        primes_bitstorage_u16v32_view_t: fn_u16v32, \
        primes_bitstorage_u32v2_view_t: fn_u32v2, \
        primes_bitstorage_u32v4_view_t: fn_u32v4, \
        primes_bitstorage_u32v8_view_t: fn_u32v8, \
        primes_bitstorage_u32v16_view_t: fn_u32v16, \
        primes_bitstorage_u64v2_view_t: fn_u64v2, \
        primes_bitstorage_u64v4_view_t: fn_u64v4, \
        primes_bitstorage_u64v8_view_t: fn_u64v8)

// Example:
//   primes_bitstorage_u32_view_t storage = { .ptr = bitstorage };
//   PRIMES_DISPATCH_BY_STORAGE_VIEW(storage,
//                                   continuePattern_uint8,
//                                   continuePattern_uint16,
//                                   continuePattern_uint32,
//                                   continuePattern_uint64,
//                                   continuePattern_uint16v2,
//                                   continuePattern_uint16v4,
//                                   continuePattern_uint16v8,
//                                   continuePattern_uint16v16,
//                                   continuePattern_uint16v32,
//                                   continuePattern_uint32v2,
//                                   continuePattern_uint32v4,
//                                   continuePattern_uint32v8,
//                                   continuePattern_uint32v16,
//                                   continuePattern_uint64v2,
//                                   continuePattern_uint64v4,
//                                   continuePattern_uint64v8)
//   (storage.ptr, source_start, destination_stop, size);

// Practical notes:
// - Prefer dispatching on a named variable, not a literal like 1ULL.
// - Keep _Generic at the API boundary; keep function(name, suffix) for the
//   implementation-generation layer.
// - This sketch matches the variant typedefs currently present in
//   varianttypes.h. If you add uint8v* typedefs later, extend the tables.
// - For the "type x unroll" matrix, _Generic can choose the type axis, but
//   you still need a separate decision for the unroll axis.

#endif

/*
#define PRIMES_VARIANTS(X, name) \
    X(name, uint8_t,  _uint8) \
    X(name, uint16_t, _uint16) \
    X(name, uint32_t, _uint32) \
    X(name, uint64_t, _uint64) \
    X(name, uint16v2_t,  _uint16v2) \
    X(name, uint16v4_t,  _uint16v4) \
    X(name, uint16v8_t,  _uint16v8) \
    X(name, uint16v16_t, _uint16v16) \
    X(name, uint16v32_t, _uint16v32) \
    X(name, uint32v2_t,  _uint32v2) \
    X(name, uint32v4_t,  _uint32v4) \
    X(name, uint32v8_t,  _uint32v8) \
    X(name, uint32v16_t, _uint32v16) \
    X(name, uint64v2_t,  _uint64v2) \
    X(name, uint64v4_t,  _uint64v4) \
    X(name, uint64v8_t,  _uint64v8)

#define PRIMES_GENERIC_CASE(name, type, suffix) \
    type: function(name, suffix),

#define PRIMES_SELECT(name, expr) \
    _Generic((expr), \
        PRIMES_VARIANTS(PRIMES_GENERIC_CASE, name) \
    )
Then you can write call helpers for common signature shapes:

c

#define PRIMES_CALL_LAST5(name, a, b, c, d, e) \
    PRIMES_SELECT(name, e)((a), (b), (c), (d), (e))

#define PRIMES_CALL_LAST6(name, a, b, c, d, e, f) \
    PRIMES_SELECT(name, f)((a), (b), (c), (d), (e), (f))
So for your case:

c

#define applyMask_index(bitstorage, start, stop, step, mask) \
    PRIMES_CALL_LAST5(applyMask_index, bitstorage, start, stop, step, mask)
    */