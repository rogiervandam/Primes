FROM ubuntu:24.04

RUN apt-get update && apt-get -y install build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

COPY *.sh *.c *.h ./

RUN chmod +x ./compile.sh

RUN chmod +x ./run.sh

RUN sed -i 's/\r$//' run.sh

RUN sed -i 's/\r$//' compile.sh

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]