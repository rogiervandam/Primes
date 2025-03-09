FROM ubuntu:24.04

RUN apt-get update && apt-get -y install build-essential \
#    valgrind nano kcachegrind \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
    && update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-14 60

WORKDIR /home/primes

COPY *.sh *.c *.h ./

RUN chmod +x ./*.sh

RUN sed -i 's/\r$//' *.sh

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]
