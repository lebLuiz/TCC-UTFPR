#!/usr/bin/env bash
# =============================================================================
# Conta as dependencias das tres aplicacoes.
#
# Metricas coletadas por aplicacao:
#   diretas_producao      dependencies do package.json
#   diretas_desenvolvimento devDependencies do package.json
#   transitivas_total     pacotes distintos realmente instalados em node_modules
#   node_modules_bytes    tamanho em disco de node_modules
#
# As transitivas sao contadas a partir da arvore resolvida (`npm ls --all`),
# e nao do package.json, porque e o numero de pacotes efetivamente instalados
# que representa o custo real de cada ecossistema.
#
# Saida: results/raw/dependencies.csv
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

DEPS_CSV="$RAW_DIR/dependencies.csv"
echo "framework,diretas_producao,diretas_desenvolvimento,diretas_total,transitivas_total,node_modules_bytes" > "$DEPS_CSV"

for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  log "Contando dependencias: $app"

  prod="$(python3 -c "
import json
with open('$dir/package.json') as f:
    print(len(json.load(f).get('dependencies', {})))
")"
  dev="$(python3 -c "
import json
with open('$dir/package.json') as f:
    print(len(json.load(f).get('devDependencies', {})))
")"

  # Pacotes distintos na arvore resolvida, incluindo os transitivos.
  transitivas="$( (cd "$dir" && npm ls --all --json --long=false 2>/dev/null) | python3 -c "
import json, sys

texto = sys.stdin.read()
if not texto.strip():
    print(0)
    raise SystemExit

arvore = json.loads(texto)
encontrados = set()

def percorrer(no):
    for nome, filho in (no.get('dependencies') or {}).items():
        chave = (nome, filho.get('version'))
        if chave in encontrados:
            continue
        encontrados.add(chave)
        percorrer(filho)

percorrer(arvore)
print(len(encontrados))
")"

  bytes="$(du -sb "$dir/node_modules" 2>/dev/null | cut -f1)"
  bytes="${bytes:-0}"

  echo "$app,$prod,$dev,$((prod + dev)),$transitivas,$bytes" >> "$DEPS_CSV"
  echo "  diretas: $((prod + dev))  transitivas: $transitivas  node_modules: $bytes bytes"
done

log "Contagem gravada em $DEPS_CSV"
