FROM alpine:3.21.3

# Install necessary dependencies
RUN apk add build-base mimalloc2-dev clang openmp-dev bash

# Set mimalloc as the default memory allocator using LD_PRELOAD
ENV LD_PRELOAD=/usr/lib/libmimalloc.so

WORKDIR /home/sieve

# Copy all shell scripts, C source, and header files
COPY src/ ./src/

# Copy builder
COPY sieve ./sieve

# Ensure the bin directory exists
RUN mkdir -p bin
RUN mkdir -p dev/build

# Make the sieve executable and resolve LF/CRLF issues
RUN chmod +x ./sieve
RUN sed -i 's/\r$//' ./sieve
RUN ./sieve compileall

ENTRYPOINT [ "./sieve" ]
