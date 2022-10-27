FROM gcc:12-bullseye

RUN apt-get update && apt-get -y install build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

COPY compile.sh run.sh *.c ./

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]