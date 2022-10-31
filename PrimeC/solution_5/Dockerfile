FROM ubuntu:22.04

RUN apt-get update && apt-get -y install build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

COPY compile.sh run.sh *.h *.c ./

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]