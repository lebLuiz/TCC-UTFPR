#!/usr/bin/env bash
# =============================================================================
# Confirma que o dataset inicial e exatamente o de `shared/dataset.json`.
#
# As tres aplicacoes importam o MESMO arquivo `shared/core/dataset.ts`, entao
# gerar os dados tres vezes seria executar o mesmo codigo tres vezes. O que
# ainda precisa ser verificado e que esse gerador produz exatamente o artefato
# canonico `shared/dataset.json`, usado pelos testes como valor esperado.
#
# A garantia de que as tres partem do mesmo codigo e feita por
# `scripts/verify-shared.sh`.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

# Executa o gerador isolado, sem framework algum.
cp "$ROOT_DIR/shared/core/dataset.ts" "$ROOT_DIR/shared/core/task.ts" "$TMP_DIR/"
echo '{ "type": "module" }' > "$TMP_DIR/package.json"
cat > "$TMP_DIR/emit.ts" <<'TS'
import { generateInitialTasks } from './dataset.ts';
import { writeFileSync } from 'node:fs';
writeFileSync(process.argv[2], JSON.stringify(generateInitialTasks(), null, 2) + '\n');
TS

node "$TMP_DIR/emit.ts" "$TMP_DIR/gerado.json"

if cmp -s "$TMP_DIR/gerado.json" "$ROOT_DIR/shared/dataset.json"; then
  registros="$(python3 -c "
import json
with open('$ROOT_DIR/shared/dataset.json') as f:
    print(len(json.load(f)))
")"
  echo "OK       o gerador reproduz shared/dataset.json ($registros registros)"
  echo "OK       as tres aplicacoes usam esse mesmo gerador (ver verify-shared.sh)"
else
  echo "FALHA    o gerador divergiu de shared/dataset.json" >&2
  echo "         Se a mudanca foi intencional, regere o artefato canonico e" >&2
  echo "         descarte os resultados anteriores, que deixam de ser comparaveis." >&2
  exit 1
fi
