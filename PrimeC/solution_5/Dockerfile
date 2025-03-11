FROM ubuntu:24.04

RUN apt-get update && apt-get -y install build-essential \
    # && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 60 \
#    valgrind nano kcachegrind \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

# Copy all shell scripts, C source, and header files
COPY *.sh *.c *.h ./

# Copy the additional directory structure
COPY bin/ ./bin
COPY src/ ./src

RUN chmod +x ./*.sh
RUN sed -i 's/\r$//' *.sh

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]
