#!/usr/bin/env bash
# Definicoes compartilhadas por todos os scripts de medicao.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RAW_DIR="$ROOT_DIR/results/raw"
PROCESSED_DIR="$ROOT_DIR/results/processed"

# Ordem fixa em todos os relatorios, para facilitar a comparacao.
APPS=(react angular vue)

app_dir() {
  case "$1" in
    react)   echo "react-app" ;;
    angular) echo "angular-app" ;;
    vue)     echo "vue-app" ;;
    *) echo "Aplicacao desconhecida: $1" >&2; return 1 ;;
  esac
}

mkdir -p "$RAW_DIR" "$PROCESSED_DIR"

# Parametros do experimento definitivo, conforme declarado na monografia.
# Sobrescreva pelo ambiente apenas para execucao rapida de verificacao;
# nesse caso NAO versione o results/ gerado, pois nao corresponde ao documento.
REPETITIONS="${REPETITIONS:-30}"
WARMUP="${WARMUP:-2}"
# Exportadas: measure-runtime.mjs (node) e collect-results.sh (python) rodam
# como processos filhos e so enxergam estas variaveis se elas forem exportadas.
export REPETITIONS WARMUP

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }

# Instante atual em milissegundos, com precisao de nanossegundos do GNU date.
now_ms() { date +%s%N | awk '{ printf "%.3f", $1 / 1000000 }'; }

# Remove todos os caches de build, garantindo compilacao "fria".
clean_build_caches() {
  local dir="$1"
  rm -rf "$dir/dist" \
         "$dir/.angular" \
         "$dir/out-tsc" \
         "$dir/node_modules/.vite" \
         "$dir/node_modules/.tmp" \
         "$dir/node_modules/.cache"
  find "$dir" -maxdepth 1 -name '*.tsbuildinfo' -delete 2>/dev/null || true
}
