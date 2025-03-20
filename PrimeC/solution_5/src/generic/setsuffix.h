#undef suffix
#ifdef variantsuffix
#define suffix NAME(subfunction,variantsuffix)
#else
#define suffix subfunction
#endif
