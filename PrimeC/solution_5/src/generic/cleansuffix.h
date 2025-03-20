#ifdef UNSET_VARIANT
    #undef variant
    #undef variant_elements
    #undef UNSET_VARIANT
#endif
#ifndef KEEP_VARIANT
    #undef variant
    #undef variant_elements
#endif

#undef variantsuffix
#undef unrollssuffix
#undef fullvariantsuffix
#undef bitbucket_t
#undef suffix
#undef subfunction
#undef BITBUCKET_ELEMENTS
#undef BITBUCKET_BASE
#undef BITBUCKET_BYTEINDEX

#ifdef UNSET_UNROLLS
    #undef unrolls
    #undef UNSET_UNROLLS
#endif