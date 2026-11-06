#!/usr/bin/env bash
# =============================================================================
# Conta as linhas de codigo das tres aplicacoes usando cloc.
#
# A contagem e feita em duas camadas, porque somar tudo esconderia o que
# realmente interessa comparar:
#
#   - "nucleo"    : shared/core/ (task.ts, dataset.ts, styles.css). E um unico
#                   arquivo de cada, importado pelas tres aplicacoes, entao
#                   contribui com o mesmo valor para todas e nao diferencia
#                   nada. Aparece uma vez por aplicacao porque representa o
#                   codigo necessario para que aquela aplicacao exista.
#   - "framework" : todo o resto de src/ mais os arquivos de configuracao. E
#                   aqui que aparece o custo de codigo de cada framework.
#
# Saida: results/raw/loc.csv (detalhado por linguagem) e um resumo por camada.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

LOC_CSV="$RAW_DIR/loc.csv"
echo "framework,camada,linguagem,arquivos,linhas_branco,linhas_comentario,linhas_codigo" > "$LOC_CSV"

# Executa o cloc e emite linhas CSV ja rotuladas com framework e camada.
run_cloc() {
  local app="$1" camada="$2"
  shift 2
  cloc --quiet --json --hide-rate "$@" 2>/dev/null \
    | python3 -c "
import json, sys
dados = json.load(sys.stdin)
for linguagem, v in dados.items():
    if linguagem in ('header', 'SUM'):
        continue
    print(f\"$app,$camada,{linguagem},{v['nFiles']},{v['blank']},{v['comment']},{v['code']}\")
" >> "$LOC_CSV"
}

for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  log "Contando linhas de codigo: $app"

  # Camada compartilhada: o mesmo diretorio para as tres aplicacoes.
  run_cloc "$app" "nucleo" "$ROOT_DIR/shared/core"

  # Camada especifica do framework: src/ mais as configuracoes.
  mapfile -t configs < <(
    find "$dir" -maxdepth 1 -type f \
      \( -name '*.json' -o -name '*.ts' -o -name '*.js' -o -name '.browserslistrc' \) \
      ! -name 'package-lock.json' | sort
  )
  run_cloc "$app" "framework" "$dir/src" "${configs[@]}"
done

log "Contagem gravada em $LOC_CSV"
python3 - "$LOC_CSV" <<'PY'
import csv, sys
from collections import defaultdict

total = defaultdict(int)
with open(sys.argv[1]) as f:
    for linha in csv.DictReader(f):
        total[(linha['framework'], linha['camada'])] += int(linha['linhas_codigo'])

print()
print(f"{'framework':<10} {'nucleo':>10} {'framework':>12} {'total':>10}")
print('-' * 46)
for app in ('react', 'angular', 'vue'):
    nucleo = total[(app, 'nucleo')]
    fw = total[(app, 'framework')]
    print(f'{app:<10} {nucleo:>10} {fw:>12} {nucleo + fw:>10}')
PY
