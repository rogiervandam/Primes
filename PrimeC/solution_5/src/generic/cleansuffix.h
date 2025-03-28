#ifdef UNSET_VARIANT
    #undef variant
    #undef variant_elements
    // #undef variant_base_type_t
    #undef UNSET_VARIANT
#endif
#ifndef KEEP_VARIANT
    #undef variant
    #undef variant_elements

    #undef preset_uint64v8
    #undef preset_uint64v4
    #undef preset_uint64v2
    #undef preset_uint32v16
    #undef preset_uint32v8
    #undef preset_uint32v4
    #undef preset_uint32v2
    #undef preset_uint16v32
    #undef preset_uint16v16
    #undef preset_uint16v8
    #undef preset_uint16v4
    #undef preset_uint16v2
    #undef preset_uint8v32
    #undef preset_uint8v16
    #undef preset_uint8v8
    #undef preset_uint8v4
    #undef preset_uint8v2

#endif

// #undef variant_base_type_t
#undef variantsuffix
#undef unrollssuffix
// #undef fullvariantsuffix
#undef bitbucket_t
#undef suffix
// #undef subfunction
#undef BITBUCKET_ELEMENTS
#undef BITBUCKET_BASE
#undef BITBUCKET_BYTEINDEX

// #ifdef UNSET_UNROLLS
//     #undef unrolls
//     #undef UNSET_UNROLLS
// #endif


#undef BITBUCKET_ELEMENTS
#undef BITBUCKET_BASE
#undef BITBUCKET_BYTEINDEX

