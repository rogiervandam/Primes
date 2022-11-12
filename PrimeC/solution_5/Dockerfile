#https://stackoverflow.com/questions/29205141/how-to-use-tcmalloc

FROM ubuntu:20.04 as ubuntu

# Fix timezone issue
ENV TZ=Europe/London
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update && apt-get -y install build-essential wget cmake \
    # && apt-get google-perftools libgoogle-perftools-dev \ 
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

RUN echo "MIMALLOC_LARGE_OS_PAGES=1" | tee -a /etc/environment
RUN echo "MIMALLOC_RESERVE_HUGE_OS_PAGES=1" | tee -a /etc/environment
RUN echo "LD_PRELOAD=/usr/local/lib/libmimalloc.so"  | tee -a /etc/environment

# RUN echo "#LD_PRELOAD=/usr/lib/libtcmalloc.so.4" | tee -a /etc/environment

WORKDIR /home/primes

COPY *.sh *.c *.h ./ 

RUN ./compile.sh

ENTRYPOINT [ "./run.sh" ]