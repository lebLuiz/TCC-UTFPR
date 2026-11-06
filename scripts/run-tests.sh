#!/usr/bin/env bash
# =============================================================================
# Executa a suite funcional (Playwright) contra as tres aplicacoes.
#
# A mesma suite roda nos tres projetos. Falha em qualquer um deles significa
# que as implementacoes divergiram e que a comparacao nao e valida.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

"$ROOT_DIR/scripts/verify-shared.sh"

for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  if [[ ! -d "$dir/dist" ]]; then
    log "Build ausente em $app; compilando antes de testar."
    (cd "$dir" && npm run build)
  fi
done

log "Executando a suite funcional nas tres aplicacoes"
cd "$ROOT_DIR/tests/playwright"
npx playwright test "$@"
