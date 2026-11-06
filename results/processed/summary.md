# Resultados do experimento

## Ambiente de execução

- Coleta iniciada em: 2026-11-05T20:23:34Z
- Sistema: Ubuntu 22.04.5 LTS (aarch64)
- CPU: aarch64 — 10 núcleos
- Memória: 7.7 GiB
- Node.js v24.16.0 / npm 11.13.0
- Em container: sim
- Repetições por métrica: 30 (+2 de aquecimento)

## Estatística descritiva

### Adicionar tarefa (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 23.78 | 25.95 | 4.40 | 18.50 | 17.10 | 29.80 | 28.73 | 22.14 | 25.42 |
| angular | 30 | 17.82 | 17.25 | 3.95 | 22.16 | 10.50 | 24.10 | 23.47 | 16.34 | 19.29 |
| vue | 30 | 20.13 | 20.95 | 3.66 | 18.17 | 12.10 | 25.40 | 23.86 | 18.76 | 21.50 |

### Alternar conclusão (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 19.01 | 17.80 | 3.60 | 18.93 | 15.30 | 25.60 | 24.77 | 17.67 | 20.36 |
| angular | 30 | 5.27 | 4.90 | 0.91 | 17.31 | 4.50 | 9.00 | 6.90 | 4.93 | 5.61 |
| vue | 30 | 14.13 | 15.90 | 5.84 | 41.31 | 6.10 | 23.10 | 22.11 | 11.95 | 16.31 |

### Atualizar tarefa (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 24.42 | 24.40 | 1.18 | 4.83 | 22.40 | 26.50 | 26.40 | 23.98 | 24.86 |
| angular | 30 | 24.15 | 23.85 | 2.06 | 8.55 | 17.90 | 28.00 | 27.41 | 23.38 | 24.92 |
| vue | 30 | 22.46 | 22.80 | 1.83 | 8.13 | 18.80 | 25.20 | 24.71 | 21.77 | 23.14 |

### Carga inicial (1000 registros) (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 119.06 | 116.05 | 7.06 | 5.93 | 112.80 | 135.20 | 133.70 | 116.42 | 121.70 |
| angular | 30 | 124.42 | 124.15 | 2.40 | 1.93 | 120.00 | 130.50 | 128.62 | 123.52 | 125.31 |
| vue | 30 | 120.76 | 120.20 | 2.08 | 1.72 | 117.10 | 125.90 | 125.16 | 119.98 | 121.53 |

### Remover tarefa (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 23.02 | 21.60 | 2.72 | 11.82 | 20.30 | 29.10 | 27.55 | 22.00 | 24.04 |
| angular | 30 | 10.61 | 10.10 | 2.05 | 19.33 | 9.80 | 21.20 | 11.57 | 9.84 | 11.37 |
| vue | 30 | 18.92 | 19.00 | 5.86 | 30.98 | 11.00 | 28.70 | 27.51 | 16.73 | 21.10 |

### Tempo de compilação (ms)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 1439.35 | 1437.64 | 9.80 | 0.68 | 1419.60 | 1464.40 | 1458.27 | 1435.69 | 1443.00 |
| angular | 30 | 2235.59 | 2220.61 | 51.22 | 2.29 | 2168.21 | 2383.44 | 2323.20 | 2216.47 | 2254.72 |
| vue | 30 | 1734.92 | 1733.46 | 13.92 | 0.80 | 1718.15 | 1782.16 | 1754.38 | 1729.72 | 1740.12 |

### Memória JS após a carga (MiB)

| framework | n | media | mediana | desvio_padrao | coef_variacao_pct | minimo | maximo | p95 | ic95_inferior | ic95_superior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| react | 30 | 5.58 | 5.59 | 0.01 | 0.24 | 5.56 | 5.61 | 5.60 | 5.58 | 5.59 |
| angular | 30 | 7.41 | 7.40 | 0.03 | 0.45 | 7.35 | 7.48 | 7.48 | 7.40 | 7.42 |
| vue | 30 | 7.77 | 7.77 | 0.02 | 0.25 | 7.73 | 7.81 | 7.79 | 7.76 | 7.77 |

## Testes de hipótese

Kruskal-Wallis como teste omnibus; havendo diferença, Mann-Whitney U em cada par com correção de Holm-Bonferroni. Nível de significância: 0,05.

| metrica | teste | comparacao | estatistica | p_valor | p_valor_corrigido | significativo | delta_cliff | tamanho_efeito |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adicionar | Kruskal-Wallis | react vs angular vs vue | 21.4177 | 0.0000 | 0.0000 | True | nan |  |
| adicionar | Mann-Whitney U | react vs angular | 751.0000 | 0.0000 | 0.0000 | True | 0.6689 | grande |
| adicionar | Mann-Whitney U | react vs vue | 635.5000 | 0.0062 | 0.0125 | True | 0.4122 | medio |
| adicionar | Mann-Whitney U | angular vs vue | 303.5000 | 0.0309 | 0.0309 | True | -0.3256 | pequeno |
| alternar | Kruskal-Wallis | react vs angular vs vue | 60.1093 | 0.0000 | 0.0000 | True | nan |  |
| alternar | Mann-Whitney U | react vs angular | 900.0000 | 0.0000 | 0.0000 | True | 1.0000 | grande |
| alternar | Mann-Whitney U | react vs vue | 638.5000 | 0.0054 | 0.0054 | True | 0.4189 | medio |
| alternar | Mann-Whitney U | angular vs vue | 25.0000 | 0.0000 | 0.0000 | True | -0.9444 | grande |
| atualizar | Kruskal-Wallis | react vs angular vs vue | 17.9451 | 0.0001 | 0.0001 | True | nan |  |
| atualizar | Mann-Whitney U | react vs angular | 500.5000 | 0.4595 | 0.4595 | False | 0.1122 | desprezivel |
| atualizar | Mann-Whitney U | react vs vue | 731.5000 | 0.0000 | 0.0001 | True | 0.6256 | grande |
| atualizar | Mann-Whitney U | angular vs vue | 652.0000 | 0.0029 | 0.0057 | True | 0.4489 | medio |
| carga-inicial | Kruskal-Wallis | react vs angular vs vue | 31.9338 | 0.0000 | 0.0000 | True | nan |  |
| carga-inicial | Mann-Whitney U | react vs angular | 178.5000 | 0.0001 | 0.0001 | True | -0.6033 | grande |
| carga-inicial | Mann-Whitney U | react vs vue | 199.5000 | 0.0002 | 0.0002 | True | -0.5567 | grande |
| carga-inicial | Mann-Whitney U | angular vs vue | 789.5000 | 0.0000 | 0.0000 | True | 0.7544 | grande |
| remover | Kruskal-Wallis | react vs angular vs vue | 57.7831 | 0.0000 | 0.0000 | True | nan |  |
| remover | Mann-Whitney U | react vs angular | 886.5000 | 0.0000 | 0.0000 | True | 0.9700 | grande |
| remover | Mann-Whitney U | react vs vue | 623.0000 | 0.0107 | 0.0107 | True | 0.3844 | medio |
| remover | Mann-Whitney U | angular vs vue | 23.0000 | 0.0000 | 0.0000 | True | -0.9489 | grande |
| compilacao | Kruskal-Wallis | react vs angular vs vue | 79.1209 | 0.0000 | 0.0000 | True | nan |  |
| compilacao | Mann-Whitney U | react vs angular | 0.0000 | 0.0000 | 0.0000 | True | -1.0000 | grande |
| compilacao | Mann-Whitney U | react vs vue | 0.0000 | 0.0000 | 0.0000 | True | -1.0000 | grande |
| compilacao | Mann-Whitney U | angular vs vue | 900.0000 | 0.0000 | 0.0000 | True | 1.0000 | grande |
| memoria-heap | Kruskal-Wallis | react vs angular vs vue | 79.1209 | 0.0000 | 0.0000 | True | nan |  |
| memoria-heap | Mann-Whitney U | react vs angular | 0.0000 | 0.0000 | 0.0000 | True | -1.0000 | grande |
| memoria-heap | Mann-Whitney U | react vs vue | 0.0000 | 0.0000 | 0.0000 | True | -1.0000 | grande |
| memoria-heap | Mann-Whitney U | angular vs vue | 0.0000 | 0.0000 | 0.0000 | True | -1.0000 | grande |

## Tamanho do build de produção

A **carga** é o que o navegador baixa para exibir a aplicação: HTML, JavaScript e CSS. É a coluna a usar na comparação.

| framework | html_bytes | js_bytes | css_bytes | carga_kib | carga_gzip_kib |
| --- | --- | --- | --- | --- | --- |
| react | 732 | 202877 | 4354 | 203.09 | 63.78 |
| angular | 1449 | 132130 | 4354 | 134.70 | 44.66 |
| vue | 734 | 73268 | 4354 | 76.52 | 29.58 |

O CSS é idêntico nas três aplicações: todas carregam a mesma folha de estilos compartilhada, o que serve de verificação de que a camada visual não introduz diferença.

O diretório `dist/` também recebe metadados de build que o navegador nunca requisita — o Angular emite `3rdpartylicenses.txt` e `prerendered-routes.json`. Eles ficam fora da carga para não penalizar o Angular por arquivos que não chegam ao usuário:

| framework | arquivos | metadados_bytes | total_dist_kib |
| --- | --- | --- | --- |
| react | 3 | 0 | 203.09 |
| angular | 5 | 14975 | 149.32 |
| vue | 3 | 0 | 76.52 |

## Linhas de código

A camada "nucleo" (`shared/core/`) é um único arquivo de cada, importado pelas três aplicações; a diferença real está na camada "framework".

| framework | linhas_framework | linhas_nucleo | linhas_total |
| --- | --- | --- | --- |
| react | 451 | 470 | 921 |
| angular | 519 | 470 | 989 |
| vue | 437 | 470 | 907 |

## Dependências

| framework | diretas_producao | diretas_desenvolvimento | diretas_total | transitivas_total | node_modules_mib |
| --- | --- | --- | --- | --- | --- |
| react | 2 | 5 | 7 | 53 | 61.0 |
| angular | 5 | 4 | 9 | 385 | 189.9 |
| vue | 1 | 5 | 6 | 18 | 57.8 |
