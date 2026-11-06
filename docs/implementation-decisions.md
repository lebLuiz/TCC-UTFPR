# Decisões de implementação

---

## D-01 — Versões fixadas exatamente

**Decisão.** Todas as dependências usam versão exata (sem `^` ou `~`), e cada
aplicação tem `package-lock.json` versionado.

**Versões.** Todas foram verificadas como disponíveis no registro npm antes de
serem fixadas.

| Item | Versão | Observação |
| --- | --- | --- |
| Node.js | 24.16.0 | Satisfaz o requisito do Angular 22 (`^24.15.0`) |
| npm | 11.13.0 | Instalado explicitamente sobre o que vem com o Node |
| React | 19.2.0 | `react` e `react-dom` |
| Angular | 22.0.0 | Todos os pacotes `@angular/*` |
| Vue | 3.5.38 | Versão exata exigida pelo projeto |
| TypeScript | 6.0.3 | Ver D-05 |
| Vite | 7.3.2 | Ver D-04 |
| Playwright | 1.63.0 | Apenas na raiz, fora das aplicações |
| Ubuntu | 22.04 LTS | Base do container |

Quando o projeto especificava uma linha de versão em vez de um patch (React
19.2, Angular 22), foi adotado o **primeiro** patch daquela linha, e não o mais
recente, para cumprir a instrução de não atualizar automaticamente para versões
mais novas.

---

## D-02 — Dataset gerado, com artefato canônico para conferência

**Decisão.** As aplicações **geram** os 1000 registros por algoritmo
determinístico (`shared/core/dataset.ts`), em vez de importar
`shared/dataset.json`.

**Justificativa técnica.** Importar o JSON embutiria cerca de 250 KB de dados
idênticos no bundle das três aplicações. Isso somaria uma constante ao tamanho
do build — uma das métricas comparadas — e comprimiria artificialmente a
diferença relativa entre os frameworks. Pior: cada bundler trata importação de
JSON de forma própria (inlining, asset separado, tree-shaking), introduzindo uma
variável não controlada.

Gerar por algoritmo mantém o bundle representativo do framework, e o custo de
CPU é idêntico porque o algoritmo é literalmente o mesmo arquivo nas três.

**Controle.** `shared/dataset.json` continua sendo o artefato canônico.
`scripts/verify-dataset.sh` executa o gerador de cada aplicação isoladamente e
compara a saída, byte a byte, com esse arquivo. A verificação roda como
pré-condição em `collect-results.sh`.

**Determinismo.** O PRNG é o mulberry32, baseado apenas em aritmética inteira de
32 bits (`Math.imul`, deslocamentos, XOR) — operações exatas e idênticas em
qualquer motor JavaScript. Semente fixa `20250101`. Nenhuma dependência de
`Math.random`, horário do sistema, locale ou ordem de chaves de objeto.

---

## D-03 — Núcleo compartilhado importado diretamente

**Decisão.** Tipo, regras de validação, mensagens, operações puras sobre
tarefas, gerador do dataset e folha de estilos vivem em `shared/core/`, e as
três aplicações **importam esses arquivos diretamente**, com caminho relativo.
Não existem cópias dentro das aplicações.

**Justificativa.** O experimento compara frameworks, não implementações de
regra de negócio. Reescrever a mesma lógica três vezes introduziria diferenças
acidentais de estilo e desempenho sem relação com o framework.

A primeira versão deste repositório mantinha cópias em `src/core/` de cada
aplicação, sincronizadas por um script. Importar diretamente é melhor porque
troca uma identidade **verificada** por uma identidade **estrutural**: existe um
único arquivo de cada, e nenhuma divergência é possível — nem por esquecimento
de rodar a sincronização, nem por edição da cópia errada.

**O que cada framework precisou.** O Vite resolve o import relativo no build
sem configuração; para o servidor de desenvolvimento foi preciso
`server.fs.allow: ['..']`, já que `shared/core/` fica fora da raiz da aplicação.
O Angular resolve o import pelo próprio compilador, e a folha de estilos global
é declarada em `angular.json` como `"../shared/core/styles.css"`.

**Verificação de que a mudança é neutra.** Os seis artefatos de build
(JavaScript e CSS das três) saíram **byte a byte idênticos** aos produzidos com
as cópias locais: 202877 e 4354 bytes no React, 132067 e 4354 no Angular, 73268
e 4354 no Vue. Nenhum dos empacotadores trata o arquivo de fora da raiz de forma
diferente, de modo que a métrica de tamanho de bundle não foi afetada.

**Controle contra regressão.** `scripts/verify-shared.sh` falha se alguma
aplicação reintroduzir um `src/core/` próprio, se algum import de núcleo
resolver para fora de `shared/core/`, ou se o `angular.json` apontar a folha de
estilos para outro lugar. Roda como pré-condição em `build-all.sh`,
`run-tests.sh`, `serve.sh` e `collect-results.sh`.

**Por que não um alias de caminho.** Um alias como `@core/task` deixaria os
imports com a mesma string nas três, o que seria mais elegante. Mas o Vite não
lê `paths` do `tsconfig` e exigiria um alias em `vite.config.ts` com caminho
absoluto, obtido via `node:url` — o que obrigaria a acrescentar `@types/node`
ao React e ao Vue, mas não ao Angular. Isso criaria assimetria justamente na
contagem de dependências, que é uma das métricas do experimento. O caminho
relativo custa nada e não desequilibra nada.

**Efeito na métrica de LOC.** A contagem é reportada em duas camadas: `nucleo`
(`shared/core/`, 474 linhas, o mesmo valor para as três) e `framework` (o que de
fato distingue). Somar as duas diluiria a diferença que interessa medir.

---

## D-04 — Ferramentas de build

**Decisão.** Angular usa o Angular CLI (`ng new`, `ng build`), a ferramenta
oficial. React e Vue usam Vite via `create-vite`, o padrão recomendado por
ambos os ecossistemas.

**Alinhamento.** O `@angular/build` do Angular 22 usa Vite 7.3.2 internamente.
React e Vue foram fixados na **mesma** versão de Vite (7.3.2), de modo que a
camada de empacotamento seja a mesma nas três.

**Limpeza do scaffold.** Os geradores produzem conjuntos diferentes de
ferramentas acessórias: o template React trazia ESLint (7 dependências de
desenvolvimento), o Angular trazia Prettier, e o Vue não trazia nenhum dos dois.
Como isso enviesaria a contagem de dependências sem qualquer relação com o
framework, todo o ferramental de lint e formatação foi removido das três. Também
foram removidos do Angular `@angular/router` (a aplicação não tem rotas) e
`@angular/forms` (ver D-08), ambos sem contrapartida em React e Vue.

Restaram, em cada aplicação, apenas o runtime do framework, o empacotador, o
TypeScript e os tipos necessários.

---

## D-05 — TypeScript e alvo de compilação idênticos

**Decisão.** As três usam TypeScript 6.0.3 e emitem ES2022.

**Justificativa.** O Angular 22 exige TypeScript `>=6.0 <6.1`; usar uma versão
diferente em React e Vue tornaria o tempo de compilação incomparável, já que a
verificação de tipos faz parte do build nos três casos (`tsc -b`, `vue-tsc -b`
e a compilação AOT do Angular).

O alvo ES2022 vem do `tsconfig` do Angular; React e Vue receberam
`build.target: 'es2022'` explícito no Vite, e o Angular recebeu um
`.browserslistrc` compatível. Sem esse alinhamento, um framework poderia gerar
código com downleveling e outro não, afetando tamanho de bundle e desempenho.

O rigor de verificação também foi igualado: `strict`, `noUnusedLocals` e
`noUnusedParameters` ativos nas três.

**Nota.** `@vue/tsconfig` foi fixado em 0.9.1 porque a versão 0.8.1, gerada pelo
template, declara `peerDependency` de TypeScript `5.x` e é incompatível com o
TypeScript 6 exigido pelo Angular.

---

## D-06 — Angular sem zone.js (zoneless)

**Decisão.** Mantida a configuração padrão do Angular CLI 22, que gera
aplicações **zoneless**, sem `zone.js`.

**Justificativa.** É o padrão oficial da ferramenta recomendada pelo próprio
Angular, e a especificação do projeto determina o uso dessa ferramenta. Forçar `zone.js`
seria desviar do padrão do framework e adicionar um polyfill que nem React nem
Vue possuem.

**Consequência a considerar na análise.** Em modo zoneless o Angular detecta
mudanças por signals, o que o aproxima do modelo de reatividade granular do Vue
e o distancia do modelo de reconciliação do React. Isso aparece com clareza nos
resultados de operações pontuais.

---

## D-07 — React sem `StrictMode`

**Decisão.** O `StrictMode` foi omitido de `react-app/src/main.tsx`.

**Justificativa.** Em desenvolvimento ele renderiza cada componente duas vezes.
Não existe equivalente em Vue nem em Angular, e mantê-lo tornaria o modo de
desenvolvimento incomparável. Em build de produção ele não tem efeito, mas
removê-lo elimina a assimetria em ambos os modos.

---

## D-08 — Ligação de formulário sem biblioteca

**Decisão.** As três usam ligação manual: valor por propriedade e atualização
por manipulador do evento `input`/`change`.

**Justificativa.** É o padrão do React (componentes controlados) e funciona
igualmente em Vue (`:value` + `@input`) e Angular (`[value]` + `(input)`). A
alternativa em Angular seria `@angular/forms` com `ngModel`, que não tem
contrapartida nas outras duas e adicionaria uma dependência exclusiva.

Pelo mesmo motivo, não se usa `v-model` no Vue: embora seja parte do núcleo do
framework, seu comportamento de duas vias não tem equivalente direto nas outras
duas implementações.

---

## D-09 — Chromium do Playwright como navegador

**Decisão.** O ambiente usa o Chromium empacotado pelo Playwright, não o Google
Chrome instalado por pacote `.deb`.

**Justificativa.** O Google Chrome não publica build estável para Linux arm64.
Usar o Chrome em x86_64 e outro navegador em arm64 tornaria as medições
dependentes da arquitetura da máquina. O Chromium do Playwright tem build
oficial para as duas arquiteturas, é a mesma versão em ambas e é fixado junto
com a versão do Playwright.

---

## D-10 — Servidor estático único

**Decisão.** As três aplicações são servidas por `scripts/serve-static.mjs`,
escrito apenas com módulos nativos do Node.

**Justificativa.** O Vite oferece `vite preview`, mas o Angular não tem comando
equivalente. Usar `vite preview` para React e Vue e outro servidor para o
Angular colocaria uma variável não controlada (cabeçalhos, compressão, cache,
versão do protocolo) exatamente na camada que entrega os arquivos medidos.

O servidor envia `Cache-Control: no-store`, de modo que nenhuma repetição se
beneficie da anterior.

---

## D-11 — Sem memoização manual

**Decisão.** Nenhuma implementação recebe otimização manual de detecção de
mudanças: sem `React.memo`, `useMemo` ou `useCallback`; sem
`ChangeDetectionStrategy.OnPush` explícito; sem `v-once` ou `shallowRef`.

**Justificativa.** A especificação do projeto determina que nenhuma otimização seja aplicada
a apenas um framework. Como não existe correspondência exata entre esses
mecanismos, qualquer tentativa de "equalizar" exigiria um julgamento subjetivo
sobre o que é equivalente a quê. Medir os três em sua configuração padrão, com
arquitetura idêntica, é a alternativa mais simples e a mais reproduzível.

**Limitação a declarar no trabalho.** O que se mede é o **comportamento padrão**
de cada framework sob uma mesma arquitetura de componentes, e não o melhor
desempenho alcançável por cada um. Em React, uma mudança de estado em `App`
reconcilia toda a lista; em Vue e no Angular zoneless, a reatividade por
dependência limita a atualização ao que mudou. Essa diferença é uma
característica real dos modelos de execução e aparece nos resultados, mas
`React.memo` reduziria a distância. Qualquer conclusão do trabalho deve deixar
esse escopo explícito.

---

## D-12 — Detalhes de comportamento não especificados

| Ponto | Decisão | Motivo |
| --- | --- | --- |
| Posição da tarefa criada | Ao final da lista | Mantém a ordem por criação, coerente com o `id` sequencial |
| Mensagem ao concluir/desmarcar | Nenhuma | O estado visual já comunica; a especificação só previa mensagens para criar, atualizar e remover |
| Ordenação da lista | Nenhuma | Ordem de inserção; ordenar acrescentaria custo idêntico mas alheio ao CRUD |
| Descrição ausente | String vazia, não `null` | Evita ramificação de tipo e mantém a validação uniforme |
| `trim()` na gravação | Aplicado a título e descrição | O valor validado e o gravado precisam coincidir |
| Formato de data | `DD/MM/AAAA HH:MM` em UTC, montado manualmente | `Intl` depende de locale e fuso e produziria saídas diferentes entre máquinas |
| Estado após recarregar | Volta ao dataset inicial | Sem persistência, conforme o escopo |
| Contador de caracteres | Exibido sob cada campo | Igual nas três; ajuda a verificar os limites |

---

## D-14 — Componentes Angular com seletor de atributo

**Decisão.** Os quatro componentes do Angular usam seletor de atributo
(`li[app-task-item]`, `section[app-task-form]`, `section[app-task-stats]`,
`section[app-task-list]`) em vez do seletor de elemento gerado por padrão.

**Justificativa.** Com seletor de elemento, o Angular envolve cada componente em
um elemento hospedeiro próprio — `<app-task-item>` dentro do `<ul>`, por
exemplo. Isso causava dois problemas:

1. **HTML inválido.** `<ul>` só admite `<li>` como filho direto.
2. **Layout diferente.** Os elementos hospedeiros geram caixas de linha e
   alteram o fluxo, produzindo posicionamento distinto do de React e Vue. A
   verificação de equivalência visual acusava a diferença.

Com seletor de atributo, o componente **é** o elemento, e o DOM renderizado
passa a ter a mesma estrutura e a mesma contagem de elementos das outras duas
implementações — o que também torna a comparação de memória e de nós do DOM mais
justa. Seletores de atributo são um recurso documentado e idiomático do Angular,
usado exatamente para esse fim.

---

## D-15 — Espaçamento por CSS em vez de espaço no template

**Decisão.** A separação entre o selo de status e o texto "Atualizada em" vem da
classe `.task-meta-text` (`margin-left: 6px`), e não de um espaço literal no
template.

**Justificativa.** Os três compiladores tratam espaços em branco de forma
diferente: o compilador de SFC do Vue remove espaços no início do conteúdo de um
elemento, o JSX remove os que acompanham quebras de linha, e o Angular colapsa
runs de espaço mas preserva um. O mesmo template escrito "igual" nos três
produzia larguras diferentes (190,8 px no Vue contra 193,8 px no React).

Mover o espaçamento para o CSS compartilhado elimina a dependência do
comportamento do compilador. Pelo mesmo motivo, as interpolações que constituem
todo o conteúdo de um elemento são escritas em linha única nos templates do
Angular.

---

## D-16 — Equivalência visual verificada por geometria, não por pixel

**Decisão.** `scripts/verify-visual.mjs` compara, elemento a elemento, a caixa
delimitadora (com tolerância de 0,5 px), a tipografia computada, as cores, o
`display` e a decoração de texto, além da altura total da página e da contagem
de elementos. Não compara capturas de tela.

**Justificativa.** A rasterização de texto do Chromium headless não é
determinística: capturas sucessivas da **mesma** aplicação, do **mesmo** build,
produzem hashes de imagem diferentes por variação de antisserrilhado. Isso foi
verificado experimentalmente durante a construção do repositório — o mesmo build
do React gerou hashes distintos entre execuções, nas mesmas faixas da tela.

Um hash de imagem, portanto, acusaria diferença onde não há, e não serve como
critério. A comparação de geometria e de estilo computado é determinística e
descreve exatamente aquilo que precisa ser equivalente.

A tolerância de 0,5 px existe porque o cálculo de layout produz frações que
dependem da ordem das operações de ponto flutuante; diferenças abaixo de um
pixel não podem sequer ser exibidas.

**Resultado atual.** 10776 elementos idênticos nas três implementações, em
1280x900 e em 375x800, com a mesma altura de página.

---

## D-13 — Estrutura do repositório

A estrutura pedida na especificação do projeto foi seguida, com dois acréscimos:

- **`shared/core/`** — o código compartilhado pelas três aplicações (D-03). Sem
  ele não haveria como garantir que as três partem do mesmo domínio.
- **`scripts/_common.sh`, `scripts/verify-shared.sh`, `scripts/install-all.sh`,
  `scripts/verify-dataset.sh`, `scripts/verify-visual.mjs`,
  `scripts/serve-static.mjs`, `scripts/serve.sh`** — apoio aos scripts
  exigidos, que continuam existindo com os nomes especificados.

O Angular CLI impõe `angular.json` e `tsconfig.app.json` na raiz de
`angular-app/`; a separação entre as três aplicações foi preservada.
