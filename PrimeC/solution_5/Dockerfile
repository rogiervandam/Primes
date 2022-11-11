FROM ubuntu:20.04

RUN apt-get update && apt-get -y install build-essential \
#    && apt install software-properties-common -y \
#    && apt-add-repository -y ppa:ubuntugis/ppa \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/primes

COPY *.sh *.c *.h ./ 

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]