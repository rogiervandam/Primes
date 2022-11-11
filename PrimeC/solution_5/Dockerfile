FROM ubuntu:20.04 as ubuntu

# Fix timezone issue
ENV TZ=Europe/London
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get -y install build-essential wget cmake \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ARG URL=https://github.com/microsoft/mimalloc/archive/refs/tags/v2.0.7.tar.gz
WORKDIR /usr/local/src/mimalloc
RUN wget -O - $URL | tar -xz --strip-components 1 \
  && mkdir -p out/releases && cd out/releases \
  && cmake ../.. \
  -DMI_BUILD_OBJECT=OFF \
  -DMI_BUILD_STATIC=OFF \
  -DMI_BUILD_TESTS=OFF \
  && make

RUN cp ./out/releases/libmimalloc.so* /usr/local/lib

WORKDIR /home/primes
COPY *.sh *.c *.h ./ 

ENV LD_PRELOAD=/usr/local/lib/libmimalloc.so 

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]