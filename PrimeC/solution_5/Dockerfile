FROM ubuntu:24.04

RUN apt-get update && apt-get -y install build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

COPY *.sh *.c *.h ./

RUN chmod +x ./*.sh

RUN sed -i 's/\r$//' *.sh

RUN ./compile.sh

# ENTRYPOINT [ "./run.sh" ]
ENTRYPOINT [ "./test.sh" ]