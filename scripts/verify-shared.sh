#!/usr/bin/env bash
# =============================================================================
# Confirma que as tres aplicacoes usam o MESMO arquivo de nucleo.
#
# Antes existiam copias de `shared/core/` dentro de cada aplicacao, mantidas em
# dia por um script de sincronizacao. Agora as tres importam diretamente de
# `shared/core/`, de modo que a identidade deixou de ser verificada e passou a
# ser estrutural: existe um unico arquivo.
#
# Este script guarda essa propriedade contra regressao, verificando que:
#   1. nenhuma aplicacao reintroduziu um diretorio `src/core` proprio;
#   2. todo import de `task`, `dataset` ou `styles.css` resolve para
#      `shared/core/`;
#   3. a folha de estilos global do Angular aponta para `shared/core`.
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

status=0

# 1. Nenhuma copia local.
for app in "${APPS[@]}"; do
  dir="$ROOT_DIR/$(app_dir "$app")"
  if [[ -d "$dir/src/core" ]]; then
    echo "FALHA    $app reintroduziu uma copia local em src/core/" >&2
    status=1
  fi
done

# 2. Todos os imports de nucleo resolvem para shared/core.
python3 - "$ROOT_DIR" "${APPS[@]}" <<'PY' || status=1
import os
import re
import sys

raiz = sys.argv[1]
apps = sys.argv[2:]
diretorios = {'react': 'react-app', 'angular': 'angular-app', 'vue': 'vue-app'}
canonico = os.path.realpath(os.path.join(raiz, 'shared', 'core'))

# Captura o caminho de qualquer import que mencione task, dataset ou styles.css.
padrao = re.compile(r"""from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+\.css)['"]""")
alvos = ('task', 'dataset', 'styles.css')

problemas = []
total = 0

for app in apps:
    base = os.path.join(raiz, diretorios[app], 'src')
    for pasta, _, arquivos in os.walk(base):
        for arquivo in arquivos:
            if not arquivo.endswith(('.ts', '.tsx', '.vue')):
                continue
            caminho = os.path.join(pasta, arquivo)
            with open(caminho, encoding='utf-8') as f:
                conteudo = f.read()
            for m in padrao.finditer(conteudo):
                especificador = m.group(1) or m.group(2)
                if not especificador.startswith('.'):
                    continue
                nome = especificador.rsplit('/', 1)[-1]
                if nome not in alvos:
                    continue
                total += 1
                resolvido = os.path.realpath(os.path.join(pasta, especificador))
                if os.path.dirname(resolvido) != canonico:
                    problemas.append(
                        f'{os.path.relpath(caminho, raiz)}: '
                        f'"{especificador}" resolve para {resolvido}'
                    )

if problemas:
    print('FALHA    imports de nucleo fora de shared/core:', file=sys.stderr)
    for p in problemas:
        print(f'         {p}', file=sys.stderr)
    raise SystemExit(1)

print(f'OK       {total} imports de nucleo, todos resolvendo para shared/core/')
PY

# 3. A folha de estilos global do Angular vem de shared/core.
estilos="$(python3 -c "
import json
with open('$ROOT_DIR/angular-app/angular.json') as f:
    config = json.load(f)
print(','.join(
    config['projects']['angular-app']['architect']['build']['options']['styles']
))
")"
if [[ "$estilos" != "../shared/core/styles.css" ]]; then
  echo "FALHA    angular.json usa styles=[$estilos], esperado ../shared/core/styles.css" >&2
  status=1
fi

if [[ $status -eq 0 ]]; then
  echo "OK       as tres aplicacoes usam o mesmo arquivo de nucleo, em shared/core/"
fi
exit $status
