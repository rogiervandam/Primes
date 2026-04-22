#include <errno.h>
#include <sched.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <sys/resource.h>
#include <unistd.h>

static inline int getBenchmarkPinnedCpu(void)
{
#ifdef __linux__
    const char* env_cpu = getenv("PRIME_BENCHMARK_CPU");
    if (env_cpu == NULL || env_cpu[0] == '\0') {
        return 0;
    }

    char* endptr = NULL;
    errno = 0;
    long cpu = strtol(env_cpu, &endptr, 10);
    if (errno != 0 || endptr == env_cpu || *endptr != '\0') {
        fprintf(stderr, "Ignoring invalid PRIME_BENCHMARK_CPU value: %s\n", env_cpu);
        return 0;
    }

    if (cpu < 0 || cpu >= CPU_SETSIZE) {
        fprintf(stderr, "Ignoring out-of-range PRIME_BENCHMARK_CPU value: %ld\n", cpu);
        return 0;
    }

    return (int)cpu;
#else
    return 0;
#endif
}

static inline void requestBenchmarkStability(void)
{
    static int warned_setpriority = 0;
    static int warned_affinity = 0;
#ifdef __APPLE__
    pthread_set_qos_class_self_np(QOS_CLASS_USER_INTERACTIVE, 0);

#elif defined(__linux__)
    if (option.fixed_benchmark_settings.threads == 1) {
        const int target_cpu = getBenchmarkPinnedCpu();
        cpu_set_t cpuset;
        CPU_ZERO(&cpuset);
        CPU_SET(target_cpu, &cpuset);

        if (sched_setaffinity(0, sizeof(cpuset), &cpuset) != 0 && warned_affinity == 0) {
            fprintf(stderr, "sched_setaffinity failed: %s\n", strerror(errno));
            warned_affinity = 1;
        }
    }

    // Stay in normal scheduling class; optionally try a slightly better nice.
    errno = 0;
    if (setpriority(PRIO_PROCESS, 0, -10) != 0 && errno != 0 && warned_setpriority == 0) {
        if (errno != EPERM && errno != EACCES) {
            fprintf(stderr, "setpriority failed: %s\n", strerror(errno));
        }
        warned_setpriority = 1;
    }
#endif
}