# Protocolo de medição

Descreve **o que** é medido, **como** é medido e **quais controles** existem
contra viés. O objetivo é que outro pesquisador consiga repetir o experimento e
julgar a validade dos números.

---

## 1. Pré-condições de validade

`scripts/collect-results.sh` interrompe a coleta se qualquer uma falhar. Sem
elas, os números não são comparáveis:

1. **Núcleo compartilhado em uso** — `verify-shared.sh` confirma que nenhuma
   aplicação reintroduziu uma cópia local de `core/` e que todos os imports de
   `task`, `dataset` e `styles.css` resolvem para `shared/core/`. As três
   importam os mesmos arquivos, de modo que a identidade é estrutural.
2. **Dataset canônico** — `verify-dataset.sh` executa o gerador e compara a
   saída com `shared/dataset.json`, o artefato usado pelos testes como valor
   esperado.
3. **Equivalência funcional** — os 13 casos de teste passam nas três (39
   execuções).
4. **Equivalência visual** — `verify-visual.mjs` confirma que os 10776 elementos
   renderizados têm a mesma geometria, tipografia, cor e `display` nas três, em
   1280x900 e em 375x800. Ver decisão D-16 para o motivo de a verificação não
   usar comparação de captura de tela.

---

## 2. Métricas

### 2.0 Correspondência com os casos de teste do artigo

O artigo nomeia as métricas como `CT-001`…`CT-013`; o repositório usa nomes
próprios. Esta tabela é a única ligação entre os dois vocabulários e deve ser
mantida sincronizada com o Quadro de casos de teste do artigo.

A numeração foi revisada em relação à proposta (TCC 1): `CT-001` e `CT-002`
eram a mesma medida e foram fundidos; `alternar` e memória ganharam casos
próprios; e as métricas de percepção foram redefinidas conforme o que o
questionário efetivamente coleta. O artigo traz o quadro de equivalência.

**Estudo A — experimento controlado**

| Caso | Métrica | Direção | Repositório | Arquivo |
| --- | --- | :---: | --- | --- |
| CT-001 | Tempo de compilação | ↓ | `tempo_ms` | `build-times.csv` |
| CT-002 | Tamanho do artefato | ↓ | bytes e gzip | `build-sizes.csv` |
| CT-003 | Carga inicial de 1000 registros | ↓ | `carga-inicial` | `runtime.csv` |
| CT-004 | Adicionar tarefa | ↓ | `adicionar` | `runtime.csv` |
| CT-005 | Atualizar tarefa | ↓ | `atualizar` | `runtime.csv` |
| CT-006 | Remover tarefa | ↓ | `remover` | `runtime.csv` |
| CT-007 | Alternar conclusão | ↓ | `alternar` | `runtime.csv` |
| CT-008 | Consumo de memória | ↓ | heap, nós, ouvintes | `memory.csv` |
| CT-009 | Linhas de código | ↓ | duas camadas | `loc.csv` |
| CT-010 | Dependências | ↓ | diretas e transitivas | `dependencies.csv` |

**Estudo B — levantamento de percepção**

| Caso | Métrica | Direção | Origem |
| --- | --- | :---: | --- |
| CT-011 | Citação da documentação como critério | ↑ | questionário, Q10 |
| CT-012 | Citação da facilidade de aprendizado | ↑ | questionário, Q10 |
| CT-013 | Satisfação com o framework em uso | ↑ | questionário, Q13 |

A coluna **Direção** indica o sentido de otimização: ↓ menor é melhor,
↑ maior é melhor.

**Limitação do Estudo B.** Com 44 respostas distribuídas em React (26),
Angular (4), Vue (4) e combinações ou tecnologias fora do escopo (10), as
métricas de percepção **não são estratificadas por framework** — os subgrupos de Angular e Vue não sustentam
interpretação. CT-011 a CT-013 são reportadas de forma agregada, sem teste
de hipótese.

### 2.1 Tempo de compilação

| | |
| --- | --- |
| Unidade | milissegundos |
| Fonte | `scripts/measure-build.sh` → `results/raw/build-times.csv` |
| Como | tempo de parede do comando `npm run build` completo |

Cada repetição é uma compilação **fria**: antes de cada uma são removidos
`dist/`, `.angular/`, `out-tsc/`, `node_modules/.vite`, `node_modules/.tmp`,
`node_modules/.cache` e os arquivos `*.tsbuildinfo`. Sem isso, a segunda
compilação de cada framework mediria o cache, não o trabalho.

A medida inclui a verificação de tipos, que faz parte do build nos três casos
(`tsc -b`, `vue-tsc -b` e a compilação AOT do Angular).

### 2.2 Tamanho do build

| | |
| --- | --- |
| Unidade | bytes |
| Fonte | `scripts/measure-build.sh` → `results/raw/build-sizes.csv` |
| Como | cada arquivo de `dist/`, em bytes brutos e comprimidos com `gzip -9` |

A análise separa duas grandezas:

- **carga** — HTML, JavaScript e CSS, isto é, o que o navegador realmente baixa
  para exibir a aplicação. É a grandeza a usar na comparação;
- **metadados de build** — arquivos que ficam em `dist/` mas nunca são
  requisitados. O Angular emite `3rdpartylicenses.txt` (~15 KB) e
  `prerendered-routes.json`; React e Vue não emitem nada equivalente. Somá-los ao
  total penalizaria o Angular por algo que não chega ao usuário.

O tamanho comprimido é reportado por ser o que trafega na rede. O CSS deve sair
idêntico nas três: como todas carregam a mesma folha compartilhada, uma
diferença ali indicaria falha de sincronização.

### 2.3 Desempenho em tempo de execução

| | |
| --- | --- |
| Unidade | milissegundos |
| Fonte | `scripts/measure-runtime.mjs` → `results/raw/runtime.csv` |

Operações medidas:

| Métrica | Início | Fim |
| --- | --- | --- |
| `carga-inicial` | início da navegação | os 1000 registros estão no DOM e pintados |
| `adicionar` | clique em `Adicionar tarefa` | a lista tem 1001 itens |
| `atualizar` | clique em `Salvar alterações` | o título mudou na lista |
| `remover` | clique em `Excluir` | a lista tem 999 itens |
| `alternar` | clique em `Concluir` | o status do item mudou |

**Como o tempo é tomado.** O cronômetro roda **dentro da página**
(`performance.now()`), nunca no processo do Node, para não incluir latência de
comunicação com o navegador. Um `MutationObserver` instalado **antes** do
clique detecta a atualização do DOM com precisão de microtarefa — usar
`requestAnimationFrame` para sondar limitaria a resolução a ~16 ms, o que é
grande demais para operações desta ordem de grandeza.

Dois tempos são gravados por repetição:

- `tempo_dom_ms` — até o DOM refletir a mudança;
- `tempo_pintura_ms` — até depois da pintura, obtido com
  `requestAnimationFrame` seguido de `setTimeout(0)`, que executa após o quadro
  ser pintado.

A análise usa `tempo_pintura_ms` como métrica principal, por corresponder ao que
o usuário percebe. `tempo_dom_ms` fica registrado para inspeção.

**Preparação fora do cronômetro.** Preencher campos e entrar em modo de edição
acontecem antes de o cronômetro começar. O preenchimento usa o setter do
protótipo de `HTMLInputElement` seguido de um evento `input` nativo — atribuir
`.value` diretamente não notificaria o React, que rastreia o valor anterior do
nó; a forma adotada funciona identicamente nos três frameworks.

### 2.4 Memória

| | |
| --- | --- |
| Unidade | bytes (relatados em MiB) |
| Fonte | `scripts/measure-runtime.mjs` → `results/raw/memory.csv` |
| Como | `Performance.getMetrics` do CDP, após a carga inicial |

Coletados `JSHeapUsedSize`, `Nodes` e `JSEventListeners`. Não há chamada de
coleta de lixo antes da leitura, então o valor é uma estimativa comparável entre
execuções do mesmo protocolo, não uma medida exata de retenção.

### 2.5 Linhas de código

| | |
| --- | --- |
| Fonte | `scripts/measure-loc.sh` (cloc) → `results/raw/loc.csv` |

Contado em duas camadas:

- **`nucleo`** — `shared/core/`, um único arquivo de cada, importado pelas
  três. Contribui com o mesmo valor para todas e, por definição, não
  diferencia nada; aparece uma vez por aplicação porque é código necessário
  para que aquela aplicação exista.
- **`framework`** — o restante de `src/` mais os arquivos de configuração da
  raiz da aplicação. É aqui que aparece o custo de código de cada framework.

`package-lock.json` e `node_modules/` ficam de fora. Somar as duas camadas
diluiria a diferença que interessa medir, por isso o relatório as separa.

### 2.6 Dependências

| | |
| --- | --- |
| Fonte | `scripts/measure-dependencies.sh` → `results/raw/dependencies.csv` |

- `diretas_producao` e `diretas_desenvolvimento` — declaradas no `package.json`;
- `transitivas_total` — pacotes distintos (nome + versão) na árvore resolvida
  por `npm ls --all`, e não no `package.json`, porque o que representa o custo
  real do ecossistema é o que de fato é instalado;
- `node_modules_bytes` — tamanho em disco.

---

## 3. Controles contra viés

**Instrumentação externa.** Nenhuma linha de código de medição existe dentro das
aplicações. Tudo é injetado pelo Playwright, identicamente nas três.

**Isolamento entre repetições.** Cada repetição usa um contexto de navegador
novo, sem cache e sem estado herdado. O servidor envia `Cache-Control:
no-store`.

**Aquecimento.** As primeiras `WARMUP` repetições (padrão: 2) são descartadas,
cobrindo aquecimento de JIT, de sistema de arquivos e do próprio navegador.

**Ordem de execução — limitação conhecida.** O laço é `para cada aplicação {
para cada métrica { para cada repetição } }`. Com `REPETITIONS=30`, as 150
execuções do React terminam antes de a primeira do Angular começar, e as do Vue
são as últimas. A ordem é determinística e portanto reproduzível, mas **não é um
controle contra viés**: se a máquina aquecer ou acumular carga ao longo da
coleta, o efeito recai sistematicamente sobre a última aplicação medida.

Para a coleta definitiva, intercalar em rodadas de ordem sorteada — `[React,
Angular, Vue]`, `[Angular, Vue, React]`, … — neutraliza a deriva e, de quebra,
transforma o desenho em blocos pareados por rodada, o que habilita Friedman com
Wilcoxon pareado no lugar de Kruskal-Wallis com Mann-Whitney. Enquanto a ordem
for fixa, a deriva precisa constar como ameaça à validade interna (§6).

**Mesma camada de entrega.** As três são servidas pelo mesmo servidor estático,
a partir do build de produção (ver D-10).

**Mesmo empacotador e mesmo alvo.** Vite 7.3.2 e ES2022 nas três (ver D-04 e
D-05).

**Sem otimização assimétrica.** Nenhuma memoização manual em nenhuma das três
(ver D-11).

---

## 4. Tratamento estatístico

`scripts/analyze-results.py`:

1. **Descritiva** — n, média, mediana, desvio padrão, coeficiente de variação,
   mínimo, máximo, p95 e intervalo de confiança de 95% da média pela
   distribuição *t* de Student.
2. **Shapiro-Wilk** por grupo, apenas para documentar a aderência à
   normalidade.
3. **Kruskal-Wallis** como teste omnibus não paramétrico entre os três
   frameworks.
4. **Mann-Whitney U** em cada par, com **correção de Bonferroni** para as três
   comparações simultâneas, quando o omnibus indica diferença (p < 0,05).
   Bonferroni é conservador; o procedimento de **Holm** controla a mesma taxa de
   erro familiar e é uniformemente mais poderoso, sob as mesmas premissas. Vale
   a troca antes da coleta definitiva.
5. **Delta de Cliff** como tamanho de efeito (0,147 pequeno; 0,33 médio; 0,474
   grande).

Testes não paramétricos foram escolhidos porque tempos de execução raramente são
normais: são limitados à esquerda e têm cauda longa à direita, causada por
escalonamento do sistema operacional e coleta de lixo. A mediana é reportada
junto da média por ser mais robusta a valores extremos.

**Leitura do coeficiente de variação.** Acima de ~15% em uma métrica de tempo, a
execução provavelmente sofreu interferência da máquina; convém repetir a coleta
com o sistema mais ocioso antes de interpretar as diferenças.

---

## 5. Parâmetros da coleta

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `REPETITIONS` | 30 | repetições medidas por métrica |
| `WARMUP` | 2 | repetições descartadas antes de medir |

Para o experimento final recomenda-se `REPETITIONS=30`, que dá poder estatístico
confortável aos testes não paramétricos:

```bash
docker compose run --rm tcc npm run experiment
```

---

## 6. Ameaças à validade

**Interna.** A máquina hospedeira não é dedicada: outros processos competem por
CPU e memória. Mitigado por repetições, aquecimento, ordem fixa e uso da
mediana; o coeficiente de variação serve de alerta.

**Interna.** As versões dos frameworks não são contemporâneas entre si — cada
uma é a especificada pelo projeto. Diferenças podem refletir o momento de cada
release, não uma propriedade permanente do framework.

**De construção.** Uma aplicação CRUD de lista não exercita roteamento,
formulários complexos, requisições assíncronas nem gerenciamento de estado
compartilhado. As conclusões valem para o tipo de aplicação medido.

**De construção.** Medir o comportamento padrão, sem memoização manual, é uma
escolha metodológica declarada (D-11) e não o melhor desempenho alcançável por
cada framework.

**Interna.** A ordem de execução é fixa e cada aplicação é medida inteiramente
antes da seguinte (§3). Deriva térmica ou carga crescente da máquina penalizam
sistematicamente a última aplicação medida. Mitigável pela intercalação descrita
em §3.

**De construção.** Quando a coleta roda dentro do contêiner, o Chromium executa
em uma VM Linux sem aceleração de GPU, com renderização por software. Isso afeta
`tempo_pintura_ms` de forma desigual conforme a estratégia de renderização de
cada framework. Build, LOC e dependências não sofrem esse efeito. O
`environment.json` registra `em_container` para que a condição seja verificável;
medições de navegador feitas no host e no contêiner não devem ser misturadas na
mesma análise.

**Externa.** As medições ocorrem em um único navegador (Chromium), em uma única
máquina e em uma única arquitetura. O `results/raw/environment.json` registra
CPU, memória, sistema e arquitetura de cada coleta justamente para que essa
limitação seja verificável.
