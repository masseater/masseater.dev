FROM ubuntu:24.04 AS fetch
ARG LLAMA_TAG=b12228
ARG LLAMA_SHA256=61672e52aefe54ef3f90babf6a9fa4489f019ae61a5bdcd55d91caa6dc6e1cee
ARG MODEL_REPOSITORY=pfnet/plamo-3-translate-0.8b-GGUF
ARG MODEL_REVISION=1cf96ae02133958a20074bfdfab76517bb737d00
ARG MODEL_FILE=plamo-3-translate-0.8b-Q4_K_M.gguf
ARG MODEL_SHA256=70891ec70dc7ab4205745a38307867c2881b99239f20327927633abfe4bc9ec6
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /fetch
RUN curl --fail --silent --show-error --location --retry 3 --output llama.tar.gz \
    "https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_TAG}/llama-${LLAMA_TAG}-bin-ubuntu-x64.tar.gz" \
  && echo "${LLAMA_SHA256}  llama.tar.gz" | sha256sum --check --quiet - \
  && mkdir llama \
  && tar --extract --gzip --file llama.tar.gz --directory llama --strip-components=1
RUN curl --fail --silent --show-error --location --retry 3 --output model.gguf \
    "https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/${MODEL_FILE}" \
  && echo "${MODEL_SHA256}  model.gguf" | sha256sum --check --quiet -
RUN mkdir licenses \
  && curl --fail --silent --show-error --location --retry 3 --output licenses/PLaMo-Community-License-ja.txt \
    "https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/LICENSE/ja" \
  && curl --fail --silent --show-error --location --retry 3 --output licenses/PLaMo-Community-License-en.txt \
    "https://huggingface.co/${MODEL_REPOSITORY}/resolve/${MODEL_REVISION}/LICENSE/en" \
  && curl --fail --silent --show-error --location --retry 3 --output licenses/llama.cpp-LICENSE.txt \
    "https://raw.githubusercontent.com/ggml-org/llama.cpp/${LLAMA_TAG}/LICENSE"

FROM ubuntu:24.04
RUN apt-get update \
  && apt-get install --yes --no-install-recommends libgomp1 libssl3t64 \
  && rm -rf /var/lib/apt/lists/*
COPY --from=fetch /fetch/llama/llama-server /fetch/llama/*.so* /opt/llama/
COPY --from=fetch /fetch/model.gguf /opt/model/model.gguf
COPY --from=fetch /fetch/licenses /opt/licenses
ENV LD_LIBRARY_PATH=/opt/llama
USER ubuntu
EXPOSE 8080
ENTRYPOINT ["/opt/llama/llama-server", "--model", "/opt/model/model.gguf", "--host", "0.0.0.0", "--port", "8080", "--ctx-size", "16384", "--parallel", "1", "--threads", "1", "--no-webui"]
