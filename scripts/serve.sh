#!/usr/bin/env bash
# =============================================================================
# Sobe as aplicacoes para uso manual no navegador.
#
# Uso:
#   ./scripts/serve.sh <modo> [aplicacao]
#
#   modo        dev      servidor de desenvolvimento, com recarga automatica
#               preview  build de producao servido estaticamente
#
#   aplicacao   react | angular | vue | all   (padrao: all)
#
# Portas (as mesmas na maquina hospedeira, ja publicadas no docker-compose.yml):
#
#   aplicacao   dev     preview
#   react       5173    4173
#   vue         5174    4174
#   angular     5175    4175
#
# Em modo `preview`, as aplicacoes que ainda nao tiverem build sao compiladas
# antes de subir.
#
# Encerre com Ctrl+C: todos os servidores sao derrubados juntos.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

MODO="${1:-}"
ALVO="${2:-all}"

if [[ "$MODO" != "dev" && "$MODO" != "preview" ]]; then
  echo "Uso: ./scripts/serve.sh <dev|preview> [react|angular|vue|all]" >&2
  exit 1
fi

porta_de() {
  case "$1:$2" in
    dev:react)       echo 5173 ;;
    dev:vue)         echo 5174 ;;
    dev:angular)     echo 5175 ;;
    preview:react)   echo 4173 ;;
    preview:vue)     echo 4174 ;;
    preview:angular) echo 4175 ;;
  esac
}

if [[ "$ALVO" == "all" ]]; then
  SELECIONADAS=("${APPS[@]}")
else
  if ! app_dir "$ALVO" >/dev/null 2>&1; then
    echo "Aplicacao desconhecida: $ALVO (use react, angular, vue ou all)" >&2
    exit 1
  fi
  SELECIONADAS=("$ALVO")
fi

PIDS=()

# Derruba todos os servidores de uma vez, inclusive os processos filhos que os
# gerenciadores de pacote criam.
encerrar() {
  echo ""
  log "Encerrando os servidores"
  for pid in "${PIDS[@]}"; do
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap encerrar INT TERM

# Prefixa cada linha de saida com o nome da aplicacao, para que os logs das tres
# permanecam legiveis quando rodam juntas.
prefixar() {
  local nome="$1"
  while IFS= read -r linha; do
    printf '[%-7s] %s\n' "$nome" "$linha"
  done
}

"$ROOT_DIR/scripts/verify-shared.sh"

if [[ "$MODO" == "preview" ]]; then
  for app in "${SELECIONADAS[@]}"; do
    dir="$ROOT_DIR/$(app_dir "$app")"
    if [[ ! -d "$dir/dist" ]]; then
      log "Build ausente em $app; compilando"
      (cd "$dir" && npm run build)
    fi
  done
fi

log "Subindo em modo $MODO: ${SELECIONADAS[*]}"
echo ""

for app in "${SELECIONADAS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  porta="$(porta_de "$MODO" "$app")"

  if [[ "$MODO" == "dev" ]]; then
    # O host de escuta esta nos proprios arquivos de configuracao
    # (vite.config.ts e angular.json), para que valha tambem fora deste script.
    (cd "$dir" && setsid npm run dev 2>&1 | prefixar "$app") &
  else
    (cd "$ROOT_DIR" && setsid node scripts/serve-static.mjs \
        "$(app_dir "$app")/dist" "$porta" 2>&1 | prefixar "$app") &
  fi
  PIDS+=($!)

  printf '  %-8s http://localhost:%s\n' "$app" "$porta"
done

echo ""
log "Pressione Ctrl+C para encerrar"
wait
