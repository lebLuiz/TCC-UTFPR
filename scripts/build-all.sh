#!/usr/bin/env bash
# =============================================================================
# Compila as tres aplicacoes em modo de producao.
#
# Sempre limpa os caches antes, para que as tres partam das mesmas condicoes.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

"$ROOT_DIR/scripts/verify-shared.sh"

for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  log "Compilando: $app"
  clean_build_caches "$dir"
  (cd "$dir" && npm run build)
done

log "As tres aplicacoes foram compiladas."
