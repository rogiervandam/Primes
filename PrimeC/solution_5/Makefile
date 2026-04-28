# Makefile for Prime Sieve project

# Default target builds all variants
all: 
	@echo "Building all variants..."
	$(MAKE) sieve_extend
	$(MAKE) sieve_classic
	$(MAKE) sieve_base
	$(MAKE) sieve_wheel
	./sieve runall

# Rule to build each variant
sieve_extend:
	@echo "Building variant: sieve_extend"
	./sieve sieve_extend compile

sieve_classic:
	@echo "Building variant: sieve_classic"
	./sieve sieve_classic64 compile
	./sieve sieve_classic8 compile

sieve_base:
	@echo "Building variant: sieve_base"
	./sieve sieve_base compile

sieve_wheel:
	@echo "Building variant: sieve_wheel"
	./sieve sieve_wheel compile
	./sieve sieve_wheel_8of30 compile

# Build the wheel cache generator tool
tools/generate_wheel_cache: tools/generate_wheel_cache.c
	@echo "Building wheel cache generator..."
	$(CC) -O2 -o $@ $<

# Generate pre-computed wheel cache headers for all standard wheel sizes.
# These are included by sieve_storage_wheel.h when WHEEL_CACHE_FILE is defined.
WHEEL_CACHE_DIR = src/sieve/wheel_cache
WHEEL_CACHE_HEADERS = \
	$(WHEEL_CACHE_DIR)/wheel_2of6.h \
	$(WHEEL_CACHE_DIR)/wheel_8of30.h \
	$(WHEEL_CACHE_DIR)/wheel_48of210.h \
	$(WHEEL_CACHE_DIR)/wheel_480of2310.h \
	$(WHEEL_CACHE_DIR)/wheel_5760of30030.h

generate_wheel_cache: tools/generate_wheel_cache $(WHEEL_CACHE_HEADERS)
	@echo "All wheel cache headers are up to date."

$(WHEEL_CACHE_DIR)/wheel_2of6.h:       tools/generate_wheel_cache | $(WHEEL_CACHE_DIR)
	tools/generate_wheel_cache 3 $@
$(WHEEL_CACHE_DIR)/wheel_8of30.h:      tools/generate_wheel_cache | $(WHEEL_CACHE_DIR)
	tools/generate_wheel_cache 5 $@
$(WHEEL_CACHE_DIR)/wheel_48of210.h:    tools/generate_wheel_cache | $(WHEEL_CACHE_DIR)
	tools/generate_wheel_cache 7 $@
$(WHEEL_CACHE_DIR)/wheel_480of2310.h:  tools/generate_wheel_cache | $(WHEEL_CACHE_DIR)
	tools/generate_wheel_cache 11 $@
$(WHEEL_CACHE_DIR)/wheel_5760of30030.h: tools/generate_wheel_cache | $(WHEEL_CACHE_DIR)
	tools/generate_wheel_cache 13 $@

$(WHEEL_CACHE_DIR):
	mkdir -p $(WHEEL_CACHE_DIR)

# Clean target to remove generated files
clean:
	@echo "Cleaning build artifacts..."
	rm -f bin/*
	rm -rf dev/build/*
	rm -rf dev/docker/dockerfiles/*
	rm -f tools/generate_wheel_cache
	@echo "Clean complete"

# Help target to show available targets
help:
	@echo "Prime Sieve Makefile"
	@echo "===================="
	@echo "Available targets:"
	@echo "  make                - Build all variants"
	@echo "  make bin/sieve_<variant> - Build a specific variant"
	@echo "  make generate_wheel_cache - Regenerate all wheel cache headers"
	@echo "  make clean          - Remove all build artifacts"
	@echo "  make help           - Show this help message"
	@echo ""
	@echo "Available variants: $(VARIANTS:%=bin/sieve_%)"

# Force rebuilding variants even if files with those names exist
.PHONY: all clean help sieve_extend sieve_classic sieve_base sieve_wheel generate_wheel_cache
