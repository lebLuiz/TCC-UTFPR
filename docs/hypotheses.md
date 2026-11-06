# Pré-registro de hipóteses

**Data de redação:** 26 de outubro de 2026
**Estado dos dados no momento da redação:** apenas a execução de verificação de
27 de setembro de 2026, com `n = 3` repetições por célula (`results/raw/runtime.csv`,
46 linhas). Essa execução é descartada e **não** é usada em nenhuma análise
reportada. A coleta definitiva ocorre depois do commit deste arquivo.

---

## 0. Por que este documento existe

Formular hipóteses depois de ver os dados e apresentá-las como se tivessem
precedido a coleta é a prática que [KERR, 1998] denomina *HARKing*
(*Hypothesizing After the Results are Known*). O efeito é inflar a taxa de
falsos positivos sem que o leitor tenha como perceber: toda diferença
encontrada passa a ser "prevista".

A defesa contra isso não é declarar boa-fé, é deixar rastro verificável. Este
arquivo é commitado no repositório **antes** da coleta definitiva, de modo que o
histórico do Git datou as hipóteses de forma independente do autor. O commit
correspondente deve ser citado na monografia.

Este documento também separa o que é **confirmatório** (hipótese dirigida,
formulada antes dos dados, submetida a teste) do que é **exploratório**
(caracterização descritiva, sem teste de hipótese). A distinção importa porque
as duas coisas sustentam afirmações de força muito diferente, e tratá-las como
equivalentes é precisamente o erro que o pré-registro evita.

---

## 1. Premissa teórica

A derivação parte da caracterização de estratégias de renderização de
[OLLILA; MÄKITALO; MIKKONEN, 2022], que classifica os frameworks pelo escopo do
trabalho disparado por uma alteração de estado: reprocessamento de componentes,
reprocessamento de elementos ou reconciliação de árvore virtual.

Sobre essa base incide um fato **verificado no código deste trabalho**, não
suposto. Nas três aplicações, toda operação substitui o vetor de tarefas por um
vetor novo, mas preserva a identidade dos objetos não alterados:

```
React     setTasks([...])            / tasks.map(t => t.id === id ? f(t) : t)
Angular   tasks.update(c => [...c])  / c.map(t => t.id === id ? f(t) : t)
Vue       tasks.value = [...]        / tasks.value.map(t => t.id === id ? f(t) : t)
```

Em uma operação sobre uma lista de 1000 registros, 999 itens conservam a mesma
referência de objeto. As três aplicações passam a tarefa como um único valor
composto e identificam a iteração pela chave `task.id`:

| | passagem do item | identificação | consequência para os 999 inalterados |
|---|---|---|---|
| React 19.2.0 | `task={task}`, **sem `memo`** | `key={task.id}` | o componente filho é reexecutado |
| Angular 22.0.0 | `input.required<Task>()` | `track task.id` | entrada inalterada: o filho não é marcado |
| Vue 3.5.38 | `:task="task"` | `:key="task.id"` | prop inalterada: a renderização do filho é evitada |

A ausência de memoização no React não é omissão: é imposta pela simetria de
implementação adotada neste trabalho (ver `docs/implementation-decisions.md`,
D-06 e D-11). Nenhuma das três aplicações recebe otimização manual que as outras
não possam receber, e a memoização automática do compilador do React não está
habilitada na configuração padrão empregada.

As hipóteses abaixo são consequência dessa premissa. Se a premissa estiver
errada, as hipóteses caem com ela — e é isso que as torna testáveis.

---

## 2. Hipóteses confirmatórias (Estudo A)

Cada hipótese declara a métrica, a direção prevista, a razão e o que a
falsificaria. "Operações localizadas" designa CT-004 a CT-007 (adicionar,
atualizar, remover, alternar), nas quais uma única tarefa de 1000 é afetada.

O conjunto reúne dois grupos de origem distinta, e a distinção é relevante para
julgar a força de cada um:

- **H1 a H4 — ferramental.** Derivam da arquitetura das cadeias de compilação e
  das convenções de cada framework. Correspondem às hipóteses registradas no
  plano de revisão do TCC 1, e portanto antecedem este documento.
- **H5 a H7 — reatividade.** Derivam da caracterização de estratégias de
  renderização da seção 1 deste documento e do fato verificado no código.
  Constituem o núcleo explicativo do trabalho.
- **H8 — magnitude.** Articula os dois grupos à comparação com a literatura.

---

### H1 — O Angular CLI compila mais lentamente que o Vite

> No tempo de compilação (CT-001), a aplicação Angular apresentará o maior
> valor, e as aplicações React e Vue, construídas com Vite, os menores.

**Razão.** A cadeia do Angular executa compilação AOT dos *templates*, gerando
código a partir deles, além de uma passagem de verificação de tipos sobre o
resultado. O Vite delega a transformação ao esbuild e não realiza compilação
equivalente de *templates* no caso do React; no do Vue, a compilação do
*template* ocorre, mas por um plugin substancialmente mais leve.

**Falsificação.** Mediana do Angular menor ou igual à de React ou Vue.

### H2 — O Angular gera o maior artefato

> No tamanho do artefato (CT-002), medido comprimido, a aplicação Angular
> apresentará o maior valor e a Vue o menor.

**Razão.** O tempo de execução distribuído do Angular inclui injeção de
dependências e a maquinaria de detecção de alterações; o do Vue é o mais enxuto
dos três. A medida relevante é a comprimida, por ser a efetivamente transferida.

**Falsificação.** Angular não maior, ou Vue não menor, no tamanho comprimido.

### H3 — O Angular exige mais código; o Vue, menos

> No volume de código da camada de framework (CT-009), a ordem será
> Vue < React < Angular.

**Razão.** O Angular separa *template* e classe em arquivos distintos e exige
decoradores e metadados explícitos de componente. O `<script setup>` do Vue é a
forma mais compacta dos três para o mesmo conteúdo.

**Escopo da medição.** A hipótese incide sobre o código-fonte da camada de
framework (TypeScript, TSX, HTML de *template* e componentes Vue), **excluindo**
os arquivos JSON de configuração. A quantidade de configuração declarada é
propriedade do formato de declaração da cadeia de ferramentas, não da
verbosidade do código escrito para implementar o requisito. O valor com
configuração incluída é reportado em paralelo, para transparência.

**Falsificação.** Qualquer inversão na ordem prevista. **Diferenças inferiores a
2% não são tratadas como apoio à direção prevista**, e sim como empate: a
sensibilidade do LOC a decisões de formatação, medida abaixo, é dessa ordem.
Declarar o limiar antes de olhar os pares evita que um par separado por poucas
linhas seja lido como confirmação.

#### Pré-condição e divulgação integral

Esta hipótese **só pode ser testada após a padronização de formatação**: sem
ela, o LOC mede estilo de escrita junto com verbosidade do framework. A
padronização foi executada em 26 de outubro de 2026, antes da coleta definitiva
(configuração única de Prettier na raiz do repositório, aplicada a `src/` das
três aplicações e a `shared/core/`; a ferramenta foi instalada apenas na raiz,
de modo a não alterar a contagem de dependências de nenhuma aplicação, que é o
CT-010).

**O efeito da padronização sobre o resultado é declarado aqui porque foi
observado antes do fechamento desta hipótese.** Considerando apenas
código-fonte:

| | antes | depois | variação |
|---|---|---|---|
| React | 382 | 373 | −9 (−2,4%) |
| Angular | 357 | **382** | **+25 (+7,0%)** |
| Vue | 383 | 371 | −12 (−3,1%) |

| | ordem |
|---|---|
| antes da padronização | Angular < React < Vue |
| depois da padronização | **Vue < React < Angular** |

A padronização **inverteu o ordenamento**: o Angular passou de menos verboso a
mais verboso sem que uma linha de lógica fosse alterada, apenas pela
reformatação de seus arquivos de *template*. Duas consequências:

1. **É a evidência mais direta da fragilidade do LOC como construto**, e deve ser
   reportada na seção de validade de construto exatamente nesses termos. A
   escolha de formatação determinou a resposta. Sem padronização declarada, o
   resultado deste caso de teste não é interpretável — e esse é o ponto do
   apontamento recebido no TCC 1 sobre a subjetividade da métrica.
2. **A margem entre os dois primeiros é de 2 linhas (0,5%)**, abaixo do limiar de
   2% fixado acima. A leitura defensável de H3, portanto, não é a ordem completa:
   é que o Angular apresenta o maior volume, enquanto React e Vue empatam. A
   confirmação de H3 será parcial e deve ser reportada como parcial.

Registra-se que estes números foram observados antes da coleta definitiva. Eles
não são alterados por ela — o CT-009 é uma contagem estática, medida uma vez por
aplicação, e não depende das repetições. O que a coleta definitiva produz são as
métricas de tempo e memória.

### H4 — O Angular tem mais dependências

> Em dependências (CT-010), a aplicação Angular apresentará o maior número,
> tanto diretas quanto transitivas.

**Razão.** O `ng new` instala a cadeia de ferramentas como dependências diretas
do projeto, enquanto as configurações com Vite declaram um conjunto menor e
delegam menos ao projeto.

**Falsificação.** Angular não apresentar o maior valor em ambas as contagens.

---

### H5 — React é mais lento nas operações localizadas

> Nas operações localizadas (CT-004 a CT-007), o tempo até a pintura do React
> será maior que o do Angular e o do Vue.

**Razão.** É a única das três configurações que reexecuta a função de
renderização dos 999 itens não afetados, por não dispor de memoização.

**Falsificação.** Kruskal-Wallis não significativo em uma dada operação, ou
Mann-Whitney que não distinga o React dos outros dois, ou δ de Cliff negligível
(|δ| < 0,147) nos pares `react × angular` e `react × vue`.

### H6 — Angular e Vue não diferem de forma praticamente relevante nas operações localizadas

> Nas operações localizadas, a diferença entre Angular e Vue terá magnitude de
> efeito no máximo pequena (|δ| < 0,33), ainda que estatisticamente
> significativa.

**Razão.** Ambos resolvem a atualização pelo grafo de dependências e evitam o
filho cuja entrada não mudou. A diferença remanescente é de implementação do
mecanismo, não de estratégia.

**Falsificação.** |δ| ≥ 0,33 no par `angular × vue` em qualquer operação
localizada.

**Ressalva registrada desde já.** H6 é uma hipótese de equivalência prática
testada com instrumental concebido para detectar diferença. Não encontrar
diferença relevante não prova que não existe. A conclusão possível é mais fraca:
este desenho, com este `n`, não detectou diferença de magnitude relevante.

### H7 — A carga inicial não separa os três

> Na carga inicial de 1000 registros (CT-003), não haverá diferença de ordem de
> magnitude entre os três frameworks.

**Razão.** Antes da primeira pintura não há estado anterior com que comparar: as
três precisam instanciar 1000 nós, e nenhuma estratégia de reatividade se aplica.
O custo é dominado pela construção do DOM, que é comum às três.

**Falsificação.** Razão entre a maior e a menor mediana ≥ 10 em CT-003.

**Por que esta hipótese importa.** H7 prevê onde a diferença **não** deve
aparecer. Uma hipótese que acerta onde o efeito existe e também onde ele não
existe é evidência mais forte da explicação proposta do que uma que só acerta o
primeiro caso — porque a segunda é compatível com "o React é lento em tudo", e a
explicação aqui é específica.

### H8 — Significância sem relevância prática, e atenuação frente a 2022

Esta hipótese tem duas partes, testadas sobre as mesmas medições.

> **H8a.** Nas operações localizadas, as diferenças entre frameworks terão
> magnitude absoluta baixa — inferior a 50 ms — podendo ser estatisticamente
> significativas sem relevância prática para o usuário final.
>
> **H8b.** A razão entre a maior e a menor mediana, nas operações localizadas,
> será inferior à ordem de magnitude (10×) relatada por
> [OLLILA; MÄKITALO; MIKKONEN, 2022].

**Razão de H8a.** A aplicação opera sobre 1000 registros, volume em que nenhuma
das três estratégias chega a custo perceptível por operação pontual. O limiar de
50 ms é adotado por ser a ordem usual abaixo da qual uma resposta é percebida
como imediata.

**Razão de H8b.** O estudo de 2022 avaliou Angular 11, React 17 e Vue 3.0.7.
Desde então o Angular adotou *signals* e operação sem `zone.js`, e o React passou
a dispor de compilador com memoização automática — dois dos três deslocaram-se
na direção da estratégia que aquele estudo identificou como a mais econômica.

**Falsificação.** H8a: diferença absoluta ≥ 50 ms em qualquer operação
localizada. H8b: razão ≥ 10 em qualquer operação localizada.

**Por que as duas partes coexistem com H5.** H5 prevê que o React será mais
lento; H8a prevê que a diferença será absolutamente pequena. **Não são
contraditórias**, e a possibilidade de ambas se confirmarem é o resultado mais
informativo que este trabalho pode produzir: uma diferença relativa grande sobre
uma base absoluta pequena. Dizer apenas "o React é N vezes mais lento" ou apenas
"a diferença é irrelevante" seria, isoladamente, enganoso. A discussão deve
reportar razão e diferença absoluta lado a lado.

**Limite do que H8b pode afirmar.** A comparação é entre estudos com aplicações,
máquinas e anos distintos. Confirmar H8b **não** demonstra que os frameworks
convergiram: demonstra que, nesta aplicação e neste ambiente, a diferença é
menor que a relatada lá. A atribuição causal à mudança de estratégia permanece
interpretativa e será reportada como tal.

---

### Controle C — Verificação de construto: a estrutura de elementos é equivalente

> A contagem de **elementos** do DOM após a carga inicial será equivalente entre
> os três frameworks, com diferença inferior a 1% entre o maior e o menor valor.

**Razão.** Não é uma previsão sobre os frameworks: é um controle. As três
aplicações importam o mesmo `shared/core/` e devem produzir a mesma estrutura de
elementos. Divergência relevante indicaria que a equivalência de implementação
falhou, e nesse caso **todas as comparações de tempo ficariam comprometidas** —
não se estaria medindo o mesmo trabalho.

**Falsificação.** Diferença ≥ 1% na contagem de elementos. Se ocorrer, a causa
deve ser localizada e corrigida antes de qualquer análise de tempo.

#### Revisão declarada deste controle

**O Controle C foi reformulado em 26 de outubro de 2026, após uma execução de verificação
de uma rodada, e antes da coleta definitiva.** A revisão é declarada aqui porque
alterar hipótese depois de ver dado só é defensável se for explícito.

A formulação original media a contagem **total** de nós (`Nodes`, do protocolo de
depuração) com limiar de 5%. Essa métrica foi reprovada na verificação: 19.587
nós no React, 18.591 no Angular e 17.842 no Vue, diferença de 9,8%. A inspeção
da composição do DOM mostrou que a divergência **não** está na estrutura de
elementos, e sim em duas categorias de nó que são artefato do compilador de cada
framework:

| | elementos | nós de texto | comentários |
|---|---|---|---|
| React | 10.786 | 8.774 | 0 |
| Angular | 10.788 | 6.771 | 1.008 |
| Vue | 10.786 | 6.772 | 257 |

**Elementos: 0,02% de diferença** (2 nós em 10.787), e o HTML renderizado é
idêntico caractere a caractere, salvo pelas âncoras de comentário. As duas
divergências têm causa identificada:

1. **Âncoras de renderização condicional.** O condicional `description !== ''`
   é materializado de três formas: o React não deixa marca quando a condição é
   falsa; o Vue deixa um comentário apenas no ramo falso (254 tarefas de
   descrição vazia, mais 3 no formulário); o Angular deixa um comentário por
   instância, independentemente do ramo (1.000, mais 8 fora da lista).

2. **Fusão de texto adjacente.** Em `{MESSAGES.columnUpdatedAt}: {formatTimestamp(...)}`
   o React produz três nós de texto, por não fundir filhos adjacentes, enquanto
   os compiladores de Vue e Angular fundem a interpolação equivalente em um só.
   São 2 nós extras por item, 2.000 no total — o que explica a diferença
   observada de 2.002.

Por que a reformulação não é um afrouxamento conveniente: o limiar foi
**reduzido** de 5% para 1% na dimensão que de fato importa, e a métrica passou a
ser aquela que determina a estrutura renderizada. O que foi removido do teste é
uma dimensão em que a diferença é propriedade conhecida dos compiladores, não
sintoma de implementação assimétrica.

A assimetria de nós de texto e comentários **não é descartada**: ela é reportada
na seção de validade de construto como característica medida das três
tecnologias, e a sua consequência sobre CT-003 é discutida explicitamente — o
React instancia cerca de 10% mais nós na carga inicial, e esse custo é parte do
seu modelo de renderização, não um desvio da equivalência exigida.

---

### Correspondência com o plano de revisão do TCC 1

O plano de revisão elaborado a partir do parecer sobre o TCC 1 registrava seis
hipóteses (item N2). A correspondência com o conjunto acima é a seguinte, e as
divergências são declaradas:

| Plano (N2) | Aqui | Situação |
|---|---|---|
| H1 — build do Vite menor que do Angular CLI | H1 | mantida |
| H2 — bundles de Vue e React menores | H2 | mantida |
| H3 — LOC: Vue < React < Angular | H3 | mantida, com pré-condição de formatação |
| H4 — Angular com mais dependências | H4 | mantida |
| H5 — diferenças CRUD de baixa magnitude absoluta | H8a | mantida, desdobrada |
| H6 — percepção não acompanha métricas objetivas | — | **removida** |
| — | H5, H6, H7 | **acrescentadas** |
| — | H8b | **acrescentada** |
| — | Controle C | **acrescentado** |

**Por que H6 do plano foi removida.** As respostas do levantamento foram
coletadas entre 31 de agosto e 18 de outubro de 2026 e já estavam tabuladas
quando o plano foi redigido — as proporções constam do próprio plano. Uma
hipótese formulada sobre elas agora seria posterior aos resultados. O Estudo B
passa a ser exploratório, conforme a § 3.1. A pergunta substantiva que a H6
pretendia responder — se a percepção acompanha a medição — permanece na
discussão, mas como confronto descritivo entre os dois estudos, não como
hipótese testada.

**Por que H5 a H7 e o Controle C foram acrescentados.** O plano não derivava
hipóteses da estratégia de renderização, embora essa seja a base teórica do
trabalho e o eixo do estudo de referência. As quatro hipóteses do plano tratam
de ferramental, que é consequência da cadeia de compilação e não do modelo de
execução. Sem H5 a H7, o trabalho mediria o desempenho das operações CRUD sem
prever nada sobre ele — e qualquer explicação dos resultados seria construída
depois de vê-los.

---

## 3. Análises exploratórias declaradas

As análises a seguir **não** têm hipótese dirigida e **não** recebem teste de
significância. São descritivas. Nenhum resultado delas pode ser apresentado na
monografia como confirmação de previsão.

### 3.1 Estudo B — levantamento de percepção (CT-011 a CT-013)

**As 38 respostas foram coletadas e analisadas antes da redação deste
documento.** Qualquer hipótese formulada agora sobre elas seria, por definição,
posterior aos resultados. Por isso o Estudo B é integralmente exploratório.

Há ainda um impedimento independente: a distribuição da amostra
(React 21, Angular 4, Vue 4, múltiplos 9) não sustenta comparação por framework
— com `n = 4`, uma única resposta divergente desloca uma proporção em 25 pontos.
O Estudo B é reportado como caracterização agregada dos critérios de escolha,
sem inferência por framework e sem teste de hipótese.

### 3.2 Núcleo compartilhado e questões discursivas

As métricas de ferramental (CT-001, CT-002, CT-009, CT-010) **não** são
exploratórias: têm hipótese dirigida em H1 a H4. Permanecem exploratórias apenas
as leituras abaixo.

**Camada de núcleo compartilhado em CT-009.** A hipótese H3 incide sobre a camada
de framework. O volume da camada `shared/core/`, importada identicamente pelas
três aplicações, é reportado em separado como verificação de que a camada comum
é de fato comum, sem previsão de direção.

**Questões discursivas do Estudo B.** As respostas às questões abertas (motivo da
escolha inicial, liberdade de escolha, problemas de desempenho enfrentados) são
submetidas a análise de conteúdo descritiva, sem quantificação inferencial.

### 3.3 Heap de memória (componente de heap do CT-008)

A contagem de elementos do DOM é o Controle C. O **heap** não é: ele
confunde o custo da estrutura de dados do framework com o tamanho do seu próprio
tempo de execução carregado, e a medição por `Performance.getMetrics` depende do
momento da coleta de lixo, que não é controlável pelo instrumento. Reportado
como métrica complementar e descritiva.

---

## 4. Regras de decisão fixadas antes da coleta

Declaradas aqui para que não possam ser escolhidas depois em função do que
favorece um resultado.

| Parâmetro | Valor |
|---|---|
| Nível de significância (α) | 0,05 |
| Repetições medidas por célula | 30 |
| Repetições de aquecimento descartadas | 2 |
| Teste de normalidade | Shapiro-Wilk |
| Teste de homocedasticidade | Levene |
| Teste omnibus | Kruskal-Wallis |
| Teste par a par | Mann-Whitney U, bilateral |
| Correção para comparações múltiplas | **Holm-Bonferroni** |
| Magnitude de efeito | δ de Cliff |
| Métrica principal de tempo | tempo até a pintura, não até o agendamento |

**Interpretação do δ de Cliff** [ROMANO et al., 2006]: |δ| < 0,147 negligível;
0,147 ≤ |δ| < 0,33 pequeno; 0,33 ≤ |δ| < 0,474 médio; |δ| ≥ 0,474 grande.

**Por que Holm e não Bonferroni.** Bonferroni multiplica todo *p* pelo número de
comparações e é uniformemente conservador: controla a taxa de erro familiar ao
custo de perder efeitos reais. Holm obtém o mesmo controle ordenando os *p* e
aplicando fator decrescente, o que é uniformemente mais poderoso sem supor
independência. Com 3 comparações por métrica a diferença é modesta, mas não há
razão para preferir o teste mais fraco.

**Regra sobre o par a par.** O teste par a par só é executado se o Kruskal-Wallis
for significativo para aquela métrica. Nenhum par é inspecionado fora dessa
condição.

**Regra sobre repetições.** O número de repetições está fixado em 30 acima. Não
será aumentado após a inspeção dos resultados. Aumentar o `n` até que um *p*
atravesse o limiar é uma forma de *p-hacking*, e o compromisso de não fazê-lo
precisa anteceder os dados para valer algo.

---

## 5. Referências citadas

- KERR, N. L. HARKing: Hypothesizing After the Results are Known.
  *Personality and Social Psychology Review*, v. 2, n. 3, p. 196–217, 1998.
- OLLILA, R.; MÄKITALO, N.; MIKKONEN, T. Modern web frameworks: a comparison of
  rendering performance. *Journal of Web Engineering*, v. 21, n. 3, 2022.
- ROMANO, J. et al. Appropriate statistics for ordinal level data.
  In: *Annual Meeting of the Florida Association of Institutional Research*, 2006.

---

## 6. Adendo de 1 de novembro de 2026 — reabertura do levantamento

Este adendo é acrescentado ao final, e **nenhuma linha anterior deste documento
foi alterada**. O registro antecipado só tem valor se o que ficou registrado
permanecer legível como estava; corrigir o passado para que ele concorde com o
presente anularia a sua função.

**O que mudou.** O formulário do Estudo B permaneceu acessível depois da data em
que este plano foi redigido e recebeu mais seis respostas, a última em 30 de
outubro de 2026. O total passou de 38 para **44**, e a janela de coleta passou a
ser de 31 de agosto a 30 de outubro de 2026. As seções 2 e 3.1 acima descrevem
corretamente o estado dos dados na data em que foram escritas.

**O que isso afeta.** Apenas os valores descritivos do Estudo B. Os números
reportados na monografia são os de N = 44: CT-011 passou de 31,6 % para 31,8 %,
CT-012 de 52,6 % para 50,0 %, e CT-013 de média 4,47 para 4,52, com mediana 5
nos dois casos. A distribuição por framework passou a React (26), Angular (4),
Vue (4) e combinações ou tecnologias fora do escopo (10). As três questões
discursivas foram recodificadas integralmente sobre o conjunto de 44, do que
resultaram 42 respostas válidas, 54 ocorrências e uma nona categoria
(*indicação ou influência de terceiros*) que não havia emergido no conjunto
anterior.

**O que isso não afeta.** Nada do Estudo A: as hipóteses H1 a H8b, o Controle C,
o plano estatístico e os 630 valores medidos são anteriores e independentes do
levantamento. E nada da validade do Estudo B enquanto registro, porque ele já
estava declarado **integralmente exploratório** na § 3.1 — nenhuma hipótese foi
formulada sobre essas respostas, nem antes nem depois, de modo que o acréscimo
de observações não pode ter influenciado teste algum. O que mudaria o estatuto
do trabalho seria formular agora uma previsão sobre os dados novos; isso não foi
feito.

**Dois achados que o acréscimo não dissolveu.** Na questão aberta sobre o motivo
da escolha inicial, o número de respondentes que mencionaram desempenho
permaneceu em **zero**, agora sobre 42 respostas em vez de 37. E a atribuição
majoritária dos problemas de desempenho ao próprio código, e não ao framework,
manteve-se na mesma proporção (10 de 15, antes 9 de 14).

---

## 7. Adendo de 5 de novembro de 2026 — descarte da coleta de 5 de novembro e recoleta

Este adendo é redigido **antes** da nova execução e registra a decisão de
descartá-la ou aceitá-la de forma incondicional. A regra fixada na § 4 — rodar
uma vez e reportar o que sair — permanece; o que se registra aqui é por que a
execução de 5 de novembro de 2026, às 19h47 UTC, não satisfaz a condição de ter
sido feita sobre o código que o protocolo descreve.

**O defeito.** Entre o commit do pré-registro (`a53ecb4`) e essa execução, uma
revisão editorial do código-fonte, destinada a remover comentários que apenas
reafirmavam o que a linha seguinte já dizia, alterou também nove blocos `if` de
uma única instrução — colapsando `if (cond) { stmt; }` em `if (cond) stmt;` — e
reescreveu um teste de vazio de `title.length === 0` para `!title.length` em
`shared/core/task.ts`. Nenhuma alteração mudou comportamento, e a suíte
funcional não distingue os dois estados.

**Por que isso invalida a execução.** Duas das métricas do Estudo A são
determinísticas e lidas diretamente do código ou do artefato compilado:

- **CT-009 (volume de código).** O colapso reduziu a contagem em 6 linhas no
  núcleo compartilhado e em 4 linhas na camada de framework de cada aplicação.
- **CT-002 (tamanho do artefato).** A reescrita do teste de vazio reduziu o
  *script* de produção em 4 bytes nas três aplicações — delta idêntico, porque
  a origem está no núcleo compartilhado. O colapso de chaves, por si, não altera
  o artefato: a minificação já emite as duas formas de modo idêntico.

Para as métricas estocásticas (CT-001, CT-003 a CT-008) o efeito esperado é
nulo, e não se alega o contrário. O problema não é de magnitude, é de
procedência: o repositório publicado deve conter o código que produziu os
números publicados, e nas duas métricas determinísticas isso deixou de valer.

**A correção.** Os nove blocos foram revertidos à forma original e a remoção de
comentários foi preservada. O código-fonte da árvore de trabalho passou a não ter
nenhuma linha de código distinta de `a53ecb4` — a diferença restante é
exclusivamente de linhas de comentário, verificada arquivo por arquivo.

**A decisão, fixada antes da execução.** A coleta de 5 de novembro às 19h47 UTC
é descartada por inteiro. Uma única nova execução é feita sobre o código
revertido e é definitiva, qualquer que seja o resultado. Nenhum valor reportado
decorre de comparação entre as duas execuções, e nenhuma hipótese, limiar ou
regra de decisão é alterada por este adendo.

**Divulgação completa.** Os números da execução descartada foram inspecionados
antes da redação deste adendo — foi essa inspeção que revelou a divergência de
CT-009 em relação ao texto da monografia e, por ela, o defeito no código. É
precisamente por isso que a decisão é registrada aqui e datada antes da
recoleta, em vez de ser apresentada depois como se nada houvesse ocorrido. A
execução descartada permanece no histórico do Git, no commit `37fa0a5`, de modo
que a substituição é auditável e nada é removido do registro.

**Verificação da correção.** Após o revert, CT-009 foi remedido de forma isolada
(`measure:loc`, determinístico, sem tocar em dado estocástico algum). A contagem
reproduziu exatamente os valores já reportados na monografia: 470 linhas no
núcleo compartilhado nas três aplicações, 373 na camada de framework do React,
382 na do Angular (196 de TypeScript e 186 de *template*) e 371 na do Vue (346
em componentes de arquivo único e 25 de TypeScript). Essa remedição é
determinística e fica, de todo modo, substituída pela execução definitiva
descrita acima.

---

## 8. Adendo de 6 de novembro de 2026 — reinício do histórico do repositório

O repositório Git local foi apagado e o repositório remoto correspondente no
GitHub, excluído, com a intenção declarada de recriar o versionamento do zero
antes da publicação. Este adendo registra a consequência desse ato sobre as
seções anteriores deste documento.

**O que se perde.** Os commits citados nominalmente no § 7 — `a53ecb4` (o
pré-registro das hipóteses) e `37fa0a5` (a coleta descartada de 19h47 UTC) —
deixaram de existir em qualquer repositório, local ou remoto. Nenhuma cópia foi
localizada. A frase do § 7 que descreve a coleta descartada como permanecendo
"no histórico do Git, auditável" não é mais verdadeira a partir desta data, e
não é corrigida ali: a regra fixada na introdução deste documento — um registro
datado não é reescrito, a mudança entra em adendo — aplica-se também a este
caso.

**O que isso afeta.** A defesa contra HARKing que a \autoref{sub:preregistro}
da monografia descreve repousa especificamente em o histórico de commits ser
público e anterior à coleta, verificável por qualquer leitor. Essa verificação
deixou de ser possível: não há mais como um leitor conferir, a partir do Git,
que a redação das hipóteses antecedeu a coleta definitiva. O conteúdo deste
arquivo — as hipóteses, os limiares, os dois adendos anteriores — permanece
inalterado e é, até onde se pode atestar, fiel ao que foi escrito nas datas que
cada seção indica. O que se perde é exclusivamente a prova independente dessa
cronologia; resta a palavra do autor, que é precisamente o que o registro
antecipado existia para não depender.

**O que isso não afeta.** Nenhum dado, nenhum veredito de hipótese e nenhuma
regra de decisão. A coleta definitiva usada na monografia é a de
2026-11-05T20:23:34Z, sobre o código revertido, e seus valores não dependem do
histórico do Git para estarem corretos — dependem da auditoria de código feita
no § 7, que qualquer leitor pode refazer a partir do estado atual dos arquivos,
independentemente de commits antigos existirem.

**Decisão sobre o texto da monografia.** A \autoref{sub:preregistro} e a lista
de contribuições metodológicas em \autoref{sec:conc-contribuicoes} afirmam que
o registro é verificável, e não apenas declarado, por meio do histórico público
do repositório. Essa afirmação precisa ser revista antes da entrega final, para
não reivindicar uma garantia que deixou de existir. A revisão não foi feita
neste adendo porque pertence ao documento da monografia, não a este registro, e
porque a decisão de como reformulá-la é do autor.

**Daqui em diante.** O repositório recriado retoma a disciplina de commits
datados a partir desta data. Isso restabelece a verificabilidade para qualquer
revisão futura deste documento, mas não resgata a prova de que a redação
original — de 26 de outubro de 2026 — precedeu a coleta de 27 de outubro. Essa
cronologia específica passa a depender da data registrada no cabeçalho deste
arquivo e da boa-fé do autor, exatamente a condição que o registro antecipado
foi criado para superar.
