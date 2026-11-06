#!/usr/bin/env bash
# =============================================================================
# Executa o experimento completo e reune todos os resultados brutos.
#
# Ordem de execucao (cada etapa depende da anterior):
#    1. verifica que as tres usam o mesmo arquivo de nucleo compartilhado;
#    2. verifica que o gerador reproduz o dataset canonico de 1000 registros;
#    3. registra os metadados do ambiente;
#    4. compila as tres aplicacoes;
#    5. roda a suite funcional (equivalencia de comportamento);
#    6. verifica a equivalencia visual das tres;
#    7. mede tempo de compilacao e tamanho do build;
#    8. mede desempenho em tempo de execucao e uso de memoria;
#    9. conta linhas de codigo;
#   10. conta dependencias.
#
# As etapas 1, 2, 5 e 6 sao pre-condicoes de validade: se qualquer uma falhar,
# as medicoes nao sao comparaveis e o script interrompe.
#
# Saida: results/raw/*.csv e results/raw/environment.json
#
# Variaveis de ambiente:
#   REPETITIONS  rodadas medidas            (padrao: 30)
#   WARMUP       rodadas descartadas antes  (padrao: 2)
#   SEED         semente da aleatorizacao   (padrao: 20261026)
# =============================================================================
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

INICIO_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Esta coleta sobrescreve results/. Com menos de 30 repeticoes ela nao
# corresponde ao que a monografia reporta, e o resultado nao deve ser
# versionado. O aviso existe porque uma execucao rapida ja apagou uma
# coleta definitiva uma vez.
# Confere o valor que os processos filhos realmente verao, e nao apenas a
# variavel do shell: measure-runtime.mjs le do ambiente, e so o enxerga se
# _common.sh tiver exportado. Uma coleta ja saiu pela metade por causa disso.
REP_EFETIVO="$(node -e 'process.stdout.write(String(Number.parseInt(process.env.REPETITIONS ?? "30", 10)))')"
if (( REP_EFETIVO != REPETITIONS )); then
  printf '\n\033[1;31m%s\033[0m\n' "ERRO: o shell usa REPETITIONS=$REPETITIONS mas o node usaria $REP_EFETIVO."
  printf '\033[1;31m%s\033[0m\n\n' "A variavel nao esta exportada. Coleta abortada."
  exit 1
fi
if (( REP_EFETIVO < 30 )); then
  printf '\n\033[1;33m%s\033[0m\n' "ATENCAO: REPETITIONS=$REP_EFETIVO (definitivo = 30)."
  printf '\033[1;33m%s\033[0m\n\n' "Isto sobrescreve results/ com dados que NAO batem com a monografia. Nao faca commit."
fi

log "1/10  Verificando o uso do nucleo compartilhado"
"$ROOT_DIR/scripts/verify-shared.sh"

log "2/10  Verificando o dataset inicial"
"$ROOT_DIR/scripts/verify-dataset.sh"

log "3/10  Registrando os metadados do ambiente"
python3 - "$RAW_DIR/environment.json" "$INICIO_ISO" <<'PY'
import json, os, platform, subprocess, sys

def executar(comando):
    try:
        return subprocess.run(
            comando, shell=True, capture_output=True, text=True, timeout=60
        ).stdout.strip()
    except Exception:
        return 'indisponivel'

def cpu_modelo():
    try:
        with open('/proc/cpuinfo') as f:
            for linha in f:
                if linha.startswith('model name'):
                    return linha.split(':', 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or 'indisponivel'

def memoria_total_bytes():
    try:
        with open('/proc/meminfo') as f:
            for linha in f:
                if linha.startswith('MemTotal'):
                    return int(linha.split()[1]) * 1024
    except OSError:
        pass
    return 0

ambiente = {
    'iniciado_em': sys.argv[2],
    'sistema_operacional': executar('. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME"') or platform.platform(),
    'kernel': platform.release(),
    'arquitetura': platform.machine(),
    'cpu_modelo': cpu_modelo(),
    'cpu_nucleos': os.cpu_count(),
    'memoria_total_bytes': memoria_total_bytes(),
    'node': executar('node --version'),
    'npm': executar('npm --version'),
    'python': platform.python_version(),
    'cloc': executar('cloc --version'),
    'playwright': executar('npx playwright --version'),
    # Versao do binario do navegador, nao a do Playwright: e ela que precisa
    # ser citada no artigo como o ambiente de execucao das medicoes.
    'chromium': executar(
        'node -e "const{chromium}=require(\'@playwright/test\');'
        'chromium.launch().then(async b=>{console.log(b.version());'
        'await b.close()}).catch(()=>console.log(\'indisponivel\'))"'
    ),
    'em_container': os.path.exists('/.dockerenv'),
    'repeticoes': int(os.environ.get('REPETITIONS', '30')),
    'aquecimentos': int(os.environ.get('WARMUP', '2')),
    # Sem a semente registrada, a ordem de execucao sorteada nao e reproduzivel
    # e a aleatorizacao deixa de ser auditavel.
    'semente_aleatorizacao': int(os.environ.get('SEED', '20261026')),
    'versoes_declaradas': {},
}

for nome, caminho in (('react', 'react-app'), ('angular', 'angular-app'), ('vue', 'vue-app')):
    with open(f'{caminho}/package.json') as f:
        pacote = json.load(f)
    ambiente['versoes_declaradas'][nome] = {
        **pacote.get('dependencies', {}),
        **pacote.get('devDependencies', {}),
    }

with open(sys.argv[1], 'w') as f:
    json.dump(ambiente, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"  sistema : {ambiente['sistema_operacional']} ({ambiente['arquitetura']})")
print(f"  cpu     : {ambiente['cpu_modelo']} / {ambiente['cpu_nucleos']} nucleos")
print(f"  node    : {ambiente['node']}   npm: {ambiente['npm']}")
PY

log "4/10  Compilando as tres aplicacoes"
"$ROOT_DIR/scripts/build-all.sh"

log "5/10  Executando a suite funcional"
"$ROOT_DIR/scripts/run-tests.sh"

log "6/10  Verificando a equivalencia visual"
node "$ROOT_DIR/scripts/verify-visual.mjs"

log "7/10  Medindo tempo de compilacao e tamanho do build"
"$ROOT_DIR/scripts/measure-build.sh"

log "8/10  Medindo desempenho em tempo de execucao"
node "$ROOT_DIR/scripts/measure-runtime.mjs"

log "9/10  Contando linhas de codigo"
"$ROOT_DIR/scripts/measure-loc.sh"

log "10/10  Contando dependencias"
"$ROOT_DIR/scripts/measure-dependencies.sh"

log "Coleta concluida. Resultados brutos em results/raw/"
ls -1 "$RAW_DIR"
