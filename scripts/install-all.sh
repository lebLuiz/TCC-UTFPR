#!/usr/bin/env bash
# =============================================================================
# Instala as dependencias das tres aplicacoes e do projeto raiz.
#
# Usa `npm ci` quando existe package-lock.json, garantindo instalacao
# reprodutivel a partir das versoes exatas travadas no lock.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

install_dir() {
  local dir="$1" name="$2"
  log "Instalando dependencias: $name"
  if [[ -f "$dir/package-lock.json" ]]; then
    (cd "$dir" && npm ci --no-audit --no-fund)
  else
    (cd "$dir" && npm install --no-audit --no-fund)
  fi
}

install_dir "$ROOT_DIR" "raiz (Playwright)"
for app in "${APPS[@]}"; do
  install_dir "$ROOT_DIR/$(app_dir "$app")" "$app"
done

log "Dependencias instaladas nas tres aplicacoes."
