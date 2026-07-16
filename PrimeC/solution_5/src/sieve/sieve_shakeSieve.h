// This is the main module that directs all the work 
static sieve_t* shakeSieve(const counter_t sieve_size, const storage_type storage)
{
    sieve_t *sieve = sieve_create(sieve_size, calcBitsize_storage(sieve_size, storage) );
    sieve_clear(sieve);

    const counter_t prime_start = storage_table[storage].highest_prime_in_storage + 1;
    const counter_t prime_max   = calcFactor_max(sieve_size);
    const counter_t factorBlock = calcFactorsize_storage(global_blocksize_bits, storage);
    
    log5("Shaking sieve to find all primes up to %ju with blocksize %ju", (uintmax_t)sieve_size, (uintmax_t)factorBlock);

    for (counter_t block_start = 0; block_start < sieve_size; block_start += factorBlock) {
        const counter_t block_stop = min(sieve_size, block_start + factorBlock);
        logStart5(sieve->bitstorage, time_wheelstorage_blockprocessing, "Processing block with range %ju - %ju", (uintmax_t)block_start, (uintmax_t)block_stop); 

        for (counter_t prime = prime_start; prime < prime_max; prime = findUnmarked(sieve, prime)) {
            markFactors(sieve, calcFactor_start(prime, block_start), block_stop, calcFactor_step(prime));
        }

        logStop5(sieve->bitstorage, time_wheelstorage_blockprocessing, "Finished processing block with range %ju - %ju", (uintmax_t)block_start, (uintmax_t)block_stop); 
    } 
    
    return sieve;
}
