#!/usr/bin/env python3
"""
===============================================================================
Análise estatística dos resultados do experimento.
===============================================================================

Lê os arquivos brutos de `results/raw/` e produz, em `results/processed/`:

    descriptive-stats.csv   estatística descritiva de cada métrica
    statistical-tests.csv   testes de hipótese entre os três frameworks
    build-summary.csv       tamanho do build consolidado por framework
    loc-summary.csv         linhas de código por camada
    summary.md              relatório legível com todas as tabelas

Procedimento estatístico
------------------------
Tempos de execução e de compilação raramente seguem distribuição normal: são
limitados à esquerda e têm cauda longa à direita, causada por escalonamento do
sistema operacional e por coleta de lixo. Por isso o roteiro é:

1. Shapiro-Wilk em cada grupo, apenas para documentar a aderência à normalidade.
2. Kruskal-Wallis como teste omnibus não paramétrico entre os três frameworks.
3. Havendo diferença (p < 0,05), Mann-Whitney U em cada par, com correção de
   Holm-Bonferroni para as três comparações simultâneas.
4. Delta de Cliff como tamanho de efeito, interpretado pelos limiares usuais
   (0,147 pequeno; 0,33 médio; 0,474 grande).

A mediana é reportada junto da média porque é mais robusta a valores extremos,
e o intervalo de confiança de 95% da média usa a distribuição t de Student.

Uso: python3 scripts/analyze-results.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

RAIZ = Path(__file__).resolve().parent.parent
BRUTO = RAIZ / 'results' / 'raw'
PROCESSADO = RAIZ / 'results' / 'processed'

FRAMEWORKS = ['react', 'angular', 'vue']
PARES = [('react', 'angular'), ('react', 'vue'), ('angular', 'vue')]
ALFA = 0.05

ROTULOS_METRICA = {
    'carga-inicial': 'Carga inicial (1000 registros)',
    'adicionar': 'Adicionar tarefa',
    'atualizar': 'Atualizar tarefa',
    'remover': 'Remover tarefa',
    'alternar': 'Alternar conclusão',
    'compilacao': 'Tempo de compilação',
}


# -----------------------------------------------------------------------------
# Estatística
# -----------------------------------------------------------------------------

def descrever(valores: np.ndarray) -> dict:
    """Estatística descritiva de uma amostra, com IC de 95% da média."""
    n = len(valores)
    media = float(np.mean(valores))
    desvio = float(np.std(valores, ddof=1)) if n > 1 else 0.0

    if n > 1 and desvio > 0:
        erro = desvio / np.sqrt(n)
        margem = float(stats.t.ppf(0.975, n - 1) * erro)
    else:
        margem = 0.0

    return {
        'n': n,
        'media': media,
        'mediana': float(np.median(valores)),
        'desvio_padrao': desvio,
        # Coeficiente de variação: dispersão relativa, útil para julgar se a
        # medição foi estável o bastante para ser comparada.
        'coef_variacao_pct': (desvio / media * 100) if media else 0.0,
        'minimo': float(np.min(valores)),
        'maximo': float(np.max(valores)),
        'p95': float(np.percentile(valores, 95)),
        'ic95_inferior': media - margem,
        'ic95_superior': media + margem,
    }


def shapiro_p(valores: np.ndarray) -> float:
    """p-valor de Shapiro-Wilk; NaN quando a amostra é pequena demais."""
    if len(valores) < 3:
        return float('nan')
    try:
        return float(stats.shapiro(valores).pvalue)
    except Exception:
        return float('nan')


def cliffs_delta(a: np.ndarray, b: np.ndarray) -> tuple[float, str]:
    """Delta de Cliff e sua interpretação qualitativa."""
    maiores = 0
    menores = 0
    for x in a:
        maiores += int(np.sum(x > b))
        menores += int(np.sum(x < b))
    delta = (maiores - menores) / (len(a) * len(b))

    absoluto = abs(delta)
    if absoluto < 0.147:
        tamanho = 'desprezivel'
    elif absoluto < 0.33:
        tamanho = 'pequeno'
    elif absoluto < 0.474:
        tamanho = 'medio'
    else:
        tamanho = 'grande'
    return delta, tamanho


def holm_bonferroni(p_valores: list[float]) -> list[float]:
    """Corrige p-valores para comparacoes multiplas pelo metodo de Holm.

    Ordena os p-valores de forma crescente e multiplica o i-esimo pelo fator
    (m - i), em que m e o numero de comparacoes. Controla a taxa de erro
    familiar no mesmo nivel que Bonferroni, mas e uniformemente mais poderoso:
    apenas o menor p-valor recebe o fator m, e os seguintes recebem fatores
    decrescentes, em vez de todos receberem m.

    O maximo cumulativo garante monotonicidade -- um p-valor corrigido nunca
    fica abaixo do de uma comparacao cujo p bruto era menor.

    Retorna os valores corrigidos na ordem original da entrada.
    """
    m = len(p_valores)
    if m == 0:
        return []

    ordem = sorted(range(m), key=lambda i: p_valores[i])
    corrigidos = [0.0] * m
    acumulado = 0.0

    for posicao, indice in enumerate(ordem):
        ajustado = p_valores[indice] * (m - posicao)
        acumulado = max(acumulado, ajustado)
        corrigidos[indice] = min(1.0, acumulado)

    return corrigidos


def comparar_grupos(metrica: str, grupos: dict[str, np.ndarray]) -> list[dict]:
    """Kruskal-Wallis seguido de Mann-Whitney par a par com correção de Holm."""
    presentes = {k: v for k, v in grupos.items() if len(v) >= 3}
    linhas: list[dict] = []

    if len(presentes) < 2:
        return linhas

    estatistica, p_omnibus = stats.kruskal(*presentes.values())
    linhas.append({
        'metrica': metrica,
        'teste': 'Kruskal-Wallis',
        'comparacao': ' vs '.join(presentes),
        'estatistica': float(estatistica),
        'p_valor': float(p_omnibus),
        'p_valor_corrigido': float(p_omnibus),
        'significativo': bool(p_omnibus < ALFA),
        'delta_cliff': float('nan'),
        'tamanho_efeito': '',
    })

    if p_omnibus >= ALFA:
        return linhas

    pares_validos = [(a, b) for a, b in PARES if a in presentes and b in presentes]

    # Duas passagens: a correcao de Holm depende da ordenacao do conjunto
    # completo de p-valores, logo nenhum deles pode ser corrigido antes de
    # todos os testes terem sido executados.
    brutos = []
    for a, b in pares_validos:
        u, p = stats.mannwhitneyu(presentes[a], presentes[b], alternative='two-sided')
        delta, tamanho = cliffs_delta(presentes[a], presentes[b])
        brutos.append({
            'comparacao': f'{a} vs {b}',
            'estatistica': float(u),
            'p_valor': float(p),
            'delta_cliff': delta,
            'tamanho_efeito': tamanho,
        })

    corrigidos = holm_bonferroni([item['p_valor'] for item in brutos])

    for item, p_corrigido in zip(brutos, corrigidos):
        linhas.append({
            'metrica': metrica,
            'teste': 'Mann-Whitney U',
            'comparacao': item['comparacao'],
            'estatistica': item['estatistica'],
            'p_valor': item['p_valor'],
            'p_valor_corrigido': float(p_corrigido),
            'significativo': bool(p_corrigido < ALFA),
            'delta_cliff': item['delta_cliff'],
            'tamanho_efeito': item['tamanho_efeito'],
        })

    return linhas


# -----------------------------------------------------------------------------
# Leitura dos dados brutos
# -----------------------------------------------------------------------------

def ler_csv(nome: str) -> pd.DataFrame | None:
    caminho = BRUTO / nome
    if not caminho.exists():
        print(f'  aviso: {nome} não encontrado; etapa ignorada.')
        return None
    return pd.read_csv(caminho)


def coletar_amostras() -> dict[str, dict[str, np.ndarray]]:
    """Junta, por métrica, as amostras de cada framework."""
    amostras: dict[str, dict[str, np.ndarray]] = {}

    runtime = ler_csv('runtime.csv')
    if runtime is not None:
        for metrica, bloco in runtime.groupby('metrica'):
            amostras[metrica] = {
                fw: bloco.loc[bloco['framework'] == fw, 'tempo_pintura_ms'].to_numpy()
                for fw in FRAMEWORKS
                if (bloco['framework'] == fw).any()
            }

    tempos_build = ler_csv('build-times.csv')
    if tempos_build is not None:
        amostras['compilacao'] = {
            fw: tempos_build.loc[tempos_build['framework'] == fw, 'tempo_ms'].to_numpy()
            for fw in FRAMEWORKS
            if (tempos_build['framework'] == fw).any()
        }

    memoria = ler_csv('memory.csv')
    if memoria is not None:
        amostras['memoria-heap'] = {
            fw: memoria.loc[memoria['framework'] == fw, 'heap_bytes'].to_numpy() / 1_048_576
            for fw in FRAMEWORKS
            if (memoria['framework'] == fw).any()
        }
        ROTULOS_METRICA['memoria-heap'] = 'Memória JS após a carga'

    return amostras


# -----------------------------------------------------------------------------
# Relatório
# -----------------------------------------------------------------------------

def tabela_markdown(df: pd.DataFrame, casas: int = 2) -> str:
    copia = df.copy()
    for coluna in copia.columns:
        if pd.api.types.is_float_dtype(copia[coluna]):
            copia[coluna] = copia[coluna].map(lambda v: f'{v:.{casas}f}')
    cabecalho = '| ' + ' | '.join(copia.columns) + ' |'
    separador = '| ' + ' | '.join('---' for _ in copia.columns) + ' |'
    linhas = [
        '| ' + ' | '.join(str(v) for v in registro) + ' |'
        for registro in copia.itertuples(index=False)
    ]
    return '\n'.join([cabecalho, separador, *linhas])


def main() -> int:
    PROCESSADO.mkdir(parents=True, exist_ok=True)
    print('Analisando os resultados em results/raw/\n')

    partes: list[str] = ['# Resultados do experimento', '']

    ambiente_arq = BRUTO / 'environment.json'
    if ambiente_arq.exists():
        ambiente = json.loads(ambiente_arq.read_text(encoding='utf-8'))
        partes += [
            '## Ambiente de execução',
            '',
            f"- Coleta iniciada em: {ambiente.get('iniciado_em')}",
            f"- Sistema: {ambiente.get('sistema_operacional')} ({ambiente.get('arquitetura')})",
            f"- CPU: {ambiente.get('cpu_modelo')} — {ambiente.get('cpu_nucleos')} núcleos",
            f"- Memória: {ambiente.get('memoria_total_bytes', 0) / 1_073_741_824:.1f} GiB",
            f"- Node.js {ambiente.get('node')} / npm {ambiente.get('npm')}",
            f"- Em container: {'sim' if ambiente.get('em_container') else 'não'}",
            f"- Repetições por métrica: {ambiente.get('repeticoes')} "
            f"(+{ambiente.get('aquecimentos')} de aquecimento)",
            '',
        ]

    # --- Estatística descritiva e testes -------------------------------------
    amostras = coletar_amostras()
    linhas_descritivas: list[dict] = []
    linhas_testes: list[dict] = []

    for metrica, grupos in amostras.items():
        for framework, valores in grupos.items():
            if len(valores) == 0:
                continue
            linhas_descritivas.append({
                'metrica': metrica,
                'framework': framework,
                **descrever(valores),
                'shapiro_p': shapiro_p(valores),
            })
        linhas_testes += comparar_grupos(metrica, grupos)

    if linhas_descritivas:
        descritivas = pd.DataFrame(linhas_descritivas)
        descritivas.to_csv(PROCESSADO / 'descriptive-stats.csv', index=False)
        print(f'  descriptive-stats.csv  ({len(descritivas)} linhas)')

        partes += ['## Estatística descritiva', '']
        for metrica in amostras:
            bloco = descritivas[descritivas['metrica'] == metrica]
            if bloco.empty:
                continue
            unidade = 'MiB' if metrica == 'memoria-heap' else 'ms'
            partes += [
                f"### {ROTULOS_METRICA.get(metrica, metrica)} ({unidade})",
                '',
                tabela_markdown(bloco[[
                    'framework', 'n', 'media', 'mediana', 'desvio_padrao',
                    'coef_variacao_pct', 'minimo', 'maximo', 'p95',
                    'ic95_inferior', 'ic95_superior',
                ]]),
                '',
            ]

    if linhas_testes:
        testes = pd.DataFrame(linhas_testes)
        testes.to_csv(PROCESSADO / 'statistical-tests.csv', index=False)
        print(f'  statistical-tests.csv  ({len(testes)} linhas)')

        partes += [
            '## Testes de hipótese',
            '',
            'Kruskal-Wallis como teste omnibus; havendo diferença, Mann-Whitney U '
            'em cada par com correção de Holm-Bonferroni. Nível de significância: 0,05.',
            '',
            tabela_markdown(testes[[
                'metrica', 'teste', 'comparacao', 'estatistica',
                'p_valor', 'p_valor_corrigido', 'significativo',
                'delta_cliff', 'tamanho_efeito',
            ]], casas=4),
            '',
        ]

    # --- Tamanho do build ----------------------------------------------------
    tamanhos = ler_csv('build-sizes.csv')
    if tamanhos is not None:
        # A "carga" e o que o navegador realmente baixa para exibir a aplicacao:
        # HTML, JavaScript e CSS. O restante que aparece em dist/ e metadado de
        # build -- o Angular emite `3rdpartylicenses.txt` (~15 KB) e
        # `prerendered-routes.json`, que nunca sao requisitados. Somar esses
        # arquivos ao total penalizaria o Angular por algo que nao chega ao
        # usuario, por isso a carga e reportada separadamente do total do
        # diretorio.
        ENTREGUES = ('html', 'js', 'css')
        carga = tamanhos[tamanhos['tipo'].isin(ENTREGUES)]

        resumo = (
            tamanhos.groupby('framework')
            .agg(
                arquivos=('arquivo', 'count'),
                total_bytes=('bytes', 'sum'),
            )
            .reindex(FRAMEWORKS)
            .reset_index()
        )

        for tipo in ENTREGUES:
            por_tipo = tamanhos[tamanhos['tipo'] == tipo].groupby('framework')['bytes'].sum()
            resumo[f'{tipo}_bytes'] = resumo['framework'].map(por_tipo).fillna(0).astype(int)

        carga_bytes = carga.groupby('framework')['bytes'].sum()
        carga_gzip = carga.groupby('framework')['bytes_gzip'].sum()
        resumo['carga_kib'] = resumo['framework'].map(carga_bytes).fillna(0) / 1024
        resumo['carga_gzip_kib'] = resumo['framework'].map(carga_gzip).fillna(0) / 1024
        resumo['metadados_bytes'] = resumo['total_bytes'] - resumo['framework'].map(
            carga_bytes
        ).fillna(0).astype(int)
        resumo['total_dist_kib'] = resumo['total_bytes'] / 1024
        resumo.to_csv(PROCESSADO / 'build-summary.csv', index=False)
        print(f'  build-summary.csv')

        partes += [
            '## Tamanho do build de produção',
            '',
            'A **carga** é o que o navegador baixa para exibir a aplicação: HTML, '
            'JavaScript e CSS. É a coluna a usar na comparação.',
            '',
            tabela_markdown(resumo[[
                'framework', 'html_bytes', 'js_bytes', 'css_bytes',
                'carga_kib', 'carga_gzip_kib',
            ]]),
            '',
            'O CSS é idêntico nas três aplicações: todas carregam a mesma folha '
            'de estilos compartilhada, o que serve de verificação de que a '
            'camada visual não introduz diferença.',
            '',
            'O diretório `dist/` também recebe metadados de build que o navegador '
            'nunca requisita — o Angular emite `3rdpartylicenses.txt` e '
            '`prerendered-routes.json`. Eles ficam fora da carga para não '
            'penalizar o Angular por arquivos que não chegam ao usuário:',
            '',
            tabela_markdown(resumo[[
                'framework', 'arquivos', 'metadados_bytes', 'total_dist_kib',
            ]]),
            '',
        ]

    # --- Linhas de código ----------------------------------------------------
    loc = ler_csv('loc.csv')
    if loc is not None:
        pivo = loc.pivot_table(
            index='framework', columns='camada',
            values='linhas_codigo', aggfunc='sum', fill_value=0,
        ).reindex(FRAMEWORKS)
        # As camadas chamam-se "nucleo" e "framework"; renomeamos as colunas para
        # nao colidirem com o indice, que tambem se chama "framework".
        pivo = pivo.rename(columns={
            'nucleo': 'linhas_nucleo',
            'framework': 'linhas_framework',
        })
        pivo['linhas_total'] = pivo.get('linhas_nucleo', 0) + pivo.get('linhas_framework', 0)
        tabela = pivo.reset_index()
        tabela.to_csv(PROCESSADO / 'loc-summary.csv', index=False)
        print(f'  loc-summary.csv')

        partes += [
            '## Linhas de código',
            '',
            'A camada "nucleo" (`shared/core/`) é um único arquivo de cada, '
            'importado pelas três aplicações; a diferença real está na camada '
            '"framework".',
            '',
            tabela_markdown(tabela, casas=0),
            '',
        ]

    # --- Dependências --------------------------------------------------------
    deps = ler_csv('dependencies.csv')
    if deps is not None:
        deps = deps.set_index('framework').reindex(FRAMEWORKS).reset_index()
        deps['node_modules_mib'] = deps['node_modules_bytes'] / 1_048_576
        partes += [
            '## Dependências',
            '',
            tabela_markdown(deps[[
                'framework', 'diretas_producao', 'diretas_desenvolvimento',
                'diretas_total', 'transitivas_total', 'node_modules_mib',
            ]], casas=1),
            '',
        ]

    saida = PROCESSADO / 'summary.md'
    saida.write_text('\n'.join(partes), encoding='utf-8')
    print(f'  summary.md\n')
    print(f'Relatório completo: {saida.relative_to(RAIZ)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
