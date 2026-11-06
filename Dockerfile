# =============================================================================
# Ambiente reprodutivel para o experimento do TCC
# "Analise comparativa de React, Angular e Vue em aplicacoes web do tipo CRUD"
#
# Base fixada em Ubuntu 22.04 LTS (jammy), conforme especificacao do projeto.
# Todas as versoes sao fixadas explicitamente para garantir reprodutibilidade.
# =============================================================================
FROM ubuntu:22.04

# Versoes fixadas (nao alterar sem atualizar docs/implementation-decisions.md)
ARG NODE_VERSION=24.16.0
ARG NPM_VERSION=11.13.0
ARG PLAYWRIGHT_VERSION=1.63.0

# TARGETARCH e preenchido automaticamente pelo BuildKit (amd64 | arm64)
ARG TARGETARCH

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=UTC \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    NODE_VERSION=${NODE_VERSION} \
    NPM_VERSION=${NPM_VERSION} \
    PLAYWRIGHT_VERSION=${PLAYWRIGHT_VERSION} \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    CI=true

# -----------------------------------------------------------------------------
# 1. Utilitarios GNU/Linux, Python 3 e ferramentas de medicao
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      wget \
      xz-utils \
      git \
      unzip \
      bash \
      coreutils \
      findutils \
      grep \
      sed \
      gawk \
      bc \
      jq \
      time \
      procps \
      tzdata \
      cloc \
      python3 \
      python3-pip \
      python3-venv \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# 2. Node.js (binario oficial, versao exata) + npm na versao exata
# -----------------------------------------------------------------------------
RUN set -eux; \
    case "${TARGETARCH:-amd64}" in \
      amd64) NODE_ARCH="x64" ;; \
      arm64) NODE_ARCH="arm64" ;; \
      *) echo "Arquitetura nao suportada: ${TARGETARCH}" >&2; exit 1 ;; \
    esac; \
    curl -fsSLo /tmp/node.tar.xz \
      "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz"; \
    curl -fsSLo /tmp/SHASUMS256.txt \
      "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"; \
    grep " node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz\$" /tmp/SHASUMS256.txt \
      | sed "s|node-v${NODE_VERSION}-linux-${NODE_ARCH}.tar.xz|/tmp/node.tar.xz|" \
      | sha256sum -c -; \
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner; \
    rm -f /tmp/node.tar.xz /tmp/SHASUMS256.txt; \
    npm install -g "npm@${NPM_VERSION}"; \
    node --version; \
    npm --version

# -----------------------------------------------------------------------------
# 3. Python 3: bibliotecas para a analise estatistica dos resultados
#    Ubuntu 22.04 fornece Python 3.10; as versoes abaixo sao as ultimas de cada
#    biblioteca compativeis com 3.10 (numpy>=2.3 e scipy>=1.16 exigem 3.11+).
# -----------------------------------------------------------------------------
RUN python3 -m pip install --no-cache-dir \
      numpy==2.2.6 \
      pandas==2.2.3 \
      scipy==1.15.3

# -----------------------------------------------------------------------------
# 4. Playwright + Chromium
#    Chromium empacotado pelo Playwright: e o unico navegador com build oficial
#    para amd64 E arm64, garantindo o mesmo motor nas duas arquiteturas.
#    Ver docs/implementation-decisions.md (decisao D-09).
# -----------------------------------------------------------------------------
RUN set -eux; \
    npm install -g "@playwright/test@${PLAYWRIGHT_VERSION}"; \
    npx --yes "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium; \
    rm -rf /var/lib/apt/lists/*

# Permite que o Playwright instalado localmente no projeto ache os navegadores
ENV NODE_PATH=/usr/local/lib/node_modules

WORKDIR /workspace

# Flags de memoria para builds com 1000 registros e bundles grandes
ENV NODE_OPTIONS=--max-old-space-size=4096

CMD ["/bin/bash"]
