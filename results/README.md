# Resultados

Este diretório contém os dados da coleta definitiva reportada na monografia,
de 5 de novembro de 2026, às 20h23 UTC (`raw/environment.json`). Os arquivos são
gerados por `scripts/collect-results.sh` e `scripts/analyze-results.py`; uma nova
coleta os sobrescreve. Para refazer só a análise a partir destes dados brutos:
`docker compose run --rm tcc npm run analyze`.

```
results/
├── raw/         dados brutos, um arquivo por medição
└── processed/   estatística e relatório
```

## `raw/` — dados brutos

| Arquivo | Conteúdo | Colunas |
| --- | --- | --- |
| `environment.json` | CPU, memória, sistema, arquitetura, versões e parâmetros da coleta | — |
| `build-times.csv` | tempo de cada compilação fria | `framework,repeticao,tempo_ms` |
| `build-sizes.csv` | cada arquivo do build, bruto e comprimido | `framework,arquivo,tipo,bytes,bytes_gzip` |
| `runtime.csv` | tempo de cada operação medida | `framework,metrica,repeticao,tempo_dom_ms,tempo_pintura_ms` |
| `memory.csv` | memória após a carga inicial | `framework,repeticao,heap_bytes,nos_dom,ouvintes` |
| `loc.csv` | linhas de código por camada e linguagem | `framework,camada,linguagem,arquivos,linhas_branco,linhas_comentario,linhas_codigo` |
| `dependencies.csv` | dependências diretas, transitivas e tamanho em disco | `framework,diretas_producao,diretas_desenvolvimento,diretas_total,transitivas_total,node_modules_bytes` |
| `e2e-report.json` | resultado da suíte funcional nos três frameworks | — |
| `execution-order.csv` | ordem realizada da coleta intercalada no navegador | `rodada,posicao,framework,metrica` |

Valores de `metrica` em `runtime.csv`: `carga-inicial`, `adicionar`,
`atualizar`, `remover`, `alternar`.

Valores de `camada` em `loc.csv`: `nucleo` (`shared/core/`, o mesmo arquivo
importado pelas três) e `framework` (código específico de cada uma).

## `processed/` — análise

| Arquivo | Conteúdo |
| --- | --- |
| `descriptive-stats.csv` | n, média, mediana, quartis e intervalo interquartil, desvio padrão, coeficiente de variação, mínimo, máximo, p95, IC 95% e p-valor de Shapiro-Wilk |
| `statistical-tests.csv` | plano registrado: Kruskal-Wallis e Mann-Whitney U (amostras independentes) com correção de Holm, mais o delta de Cliff |
| `independence-checks.csv` | tendência temporal e autocorrelação por célula, e correlação entre frameworks na mesma rodada |
| `sensitivity-tests.csv` | análise de sensibilidade não registrada previamente: Friedman e Wilcoxon pareado com Holm, comparados ao plano registrado |
| `build-summary.csv` | tamanho do build por framework, separando a carga entregue ao navegador (HTML + JS + CSS) dos metadados de build |
| `loc-summary.csv` | linhas de código por camada |
| `summary.md` | relatório legível com todas as tabelas |

## Como interpretar

**Comece pelo coeficiente de variação.** Acima de ~15% em uma métrica de tempo,
a coleta provavelmente sofreu interferência da máquina e as diferenças entre
frameworks não devem ser interpretadas antes de repetir com o sistema ocioso.

**Prefira a mediana à média** nas métricas de tempo: ela resiste melhor aos
valores extremos causados por escalonamento do sistema operacional e coleta de
lixo.

**Diferença significativa não é diferença relevante.** Com repetições
suficientes, o teste detecta diferenças pequenas. Leia o p-valor junto do delta
de Cliff e da diferença absoluta em milissegundos.

**O CSS deve ser idêntico nas três** em `build-sizes.csv`. Se não for, a folha
de estilos compartilhada saiu de sincronia e a comparação está comprometida.

**Compare a carga, não o total do `dist/`.** O Angular emite arquivos de
metadados (`3rdpartylicenses.txt`, `prerendered-routes.json`) que o navegador
nunca baixa; a coluna `carga_kib` já os exclui.

**A camada `nucleo` do `loc.csv` deve ter o mesmo valor nas três.** É o mesmo
diretório contado uma vez por aplicação; qualquer divergência indica erro no
script de contagem.

O significado de cada métrica e os controles aplicados estão em
`docs/measurement-protocol.md`.

## Versionamento

Os CSVs gerados **não** são versionados (ver `.gitignore`), porque dependem da
máquina. Para publicar uma coleta específica junto do trabalho, guarde os CSVs,
o `environment.json` e o commit exato do repositório.
