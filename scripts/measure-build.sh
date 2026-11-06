#!/usr/bin/env bash
# =============================================================================
# Mede o tempo de compilacao de producao e o tamanho do build das tres apps.
#
# Cada repeticao e uma compilacao FRIA: dist/, .angular/, node_modules/.vite e
# os arquivos .tsbuildinfo sao removidos antes de cada execucao, de modo que
# nenhuma aplicacao se beneficie de cache de uma execucao anterior.
#
# Saida: results/raw/build-times.csv e results/raw/build-sizes.csv
#
# Variaveis de ambiente:
#   REPETITIONS  numero de compilacoes medidas por aplicacao (padrao: 10)
#   WARMUP       compilacoes descartadas antes de medir      (padrao: 2)
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

TIMES_CSV="$RAW_DIR/build-times.csv"
SIZES_CSV="$RAW_DIR/build-sizes.csv"

echo "framework,repeticao,tempo_ms" > "$TIMES_CSV"
echo "framework,arquivo,tipo,bytes,bytes_gzip" > "$SIZES_CSV"

for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"

  log "Medindo build: $app ($WARMUP aquecimentos + $REPETITIONS repeticoes)"

  for ((i = 1; i <= WARMUP; i++)); do
    clean_build_caches "$dir"
    (cd "$dir" && npm run build >/dev/null 2>&1)
    echo "  aquecimento $i/$WARMUP concluido"
  done

  for ((i = 1; i <= REPETITIONS; i++)); do
    clean_build_caches "$dir"
    start="$(now_ms)"
    (cd "$dir" && npm run build >/dev/null 2>&1)
    end="$(now_ms)"
    elapsed="$(awk -v a="$end" -v b="$start" 'BEGIN { printf "%.3f", a - b }')"
    echo "$app,$i,$elapsed" >> "$TIMES_CSV"
    echo "  repeticao $i/$REPETITIONS: ${elapsed} ms"
  done

  # Tamanho do artefato final, medido apos a ultima compilacao.
  while IFS= read -r file; do
    rel="${file#"$dir/dist/"}"
    bytes="$(stat -c %s "$file")"
    gzip_bytes="$(gzip -9 -c "$file" | wc -c)"
    case "$file" in
      *.js)   tipo="js" ;;
      *.css)  tipo="css" ;;
      *.html) tipo="html" ;;
      *)      tipo="outro" ;;
    esac
    echo "$app,$rel,$tipo,$bytes,$gzip_bytes" >> "$SIZES_CSV"
  done < <(find "$dir/dist" -type f | sort)
done

log "Tempos gravados em $TIMES_CSV"
log "Tamanhos gravados em $SIZES_CSV"
