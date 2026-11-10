# Análise comparativa de React, Angular e Vue em aplicações web do tipo CRUD

Repositório de apoio ao experimento do Trabalho de Conclusão de Curso de mesmo
título. Contém **três implementações funcionalmente equivalentes** de uma
aplicação de lista de tarefas — uma em React, uma em Angular e uma em Vue — e a
infraestrutura para medi-las sob as mesmas condições.

As três compartilham a mesma especificação, a mesma estrutura de componentes, os
mesmos 1000 registros iniciais, os mesmos textos e o mesmo CSS. O que varia é
apenas o framework.

---

## Início rápido

Requisito único: **Docker** com Compose v2.

```bash
docker compose build                      # constrói o ambiente (Ubuntu 22.04)
docker compose run --rm tcc npm run install:all
docker compose run --rm tcc npm run experiment
```

Ao final, o relatório está em `results/processed/summary.md`.

Para só ver as três aplicações funcionando no navegador:

```bash
docker compose run --rm --service-ports tcc npm run dev
```

React em http://localhost:5173, Vue em http://localhost:5174 e Angular em
http://localhost:5175. Detalhes em
[Abrir as aplicações no navegador](#abrir-as-aplicações-no-navegador).

---

## Versões fixadas

Todas as versões são exatas, sem faixas, e travadas em `package-lock.json`.

| Item | Versão |
| --- | --- |
| Ubuntu | 22.04 LTS |
| Node.js | 24.16.0 |
| npm | 11.13.0 |
| React | 19.2.0 |
| Angular | 22.0.0 |
| Vue | 3.5.38 |
| TypeScript | 6.0.3 (nas três) |
| Vite | 7.3.2 (nas três) |
| Playwright | 1.63.0 |
| cloc | 1.90 |

O TypeScript e o Vite são os mesmos nas três porque o Angular 22 exige
TypeScript `>=6.0 <6.1` e usa Vite 7.3.2 internamente; alinhar React e Vue
elimina o compilador e o empacotador como variáveis. Ver
[D-04](docs/implementation-decisions.md) e [D-05](docs/implementation-decisions.md).

---

## Estrutura

```
TCC/
├── Dockerfile              Ubuntu 22.04 + Node + Python + cloc + Chromium
├── docker-compose.yml
├── package.json            scripts de orquestração
├── shared/
│   ├── specification.md    contrato funcional das três implementações
│   ├── test-cases.md       os 13 casos de teste
│   ├── dataset.json        os 1000 registros canônicos (conferência)
│   └── core/               importado diretamente pelas três aplicações
│       ├── task.ts         entidade, validação, mensagens, operações puras
│       ├── dataset.ts      gerador determinístico dos 1000 registros
│       └── styles.css      folha de estilos única das três
├── react-app/              React 19.2 + Vite
├── angular-app/            Angular 22 (Angular CLI)
├── vue-app/                Vue 3.5.38 + Vite
├── tests/
│   ├── playwright/         suíte executada contra as três
│   └── fixtures/           valores esperados do dataset
├── scripts/                build, medição, coleta e análise
├── results/                dados brutos e análise (gerados)
└── docs/
    ├── implementation-decisions.md
    ├── measurement-protocol.md
    └── reproducibility.md
```

### O núcleo compartilhado

`shared/core/` contém tudo que **não** deve variar entre as implementações: a
entidade, as regras de validação, os textos, as operações puras sobre tarefas,
o gerador do dataset e o CSS.

As três aplicações **importam esses arquivos diretamente**. Não existem cópias:

```ts
// react-app/src/App.tsx, vue-app/src/App.vue, angular-app/src/app/app.ts
import { generateInitialTasks } from '../../shared/core/dataset';
```

O Angular carrega o CSS pelo `angular.json` (`"styles": ["../shared/core/styles.css"]`),
que é o mecanismo oficial do framework para estilo global; React e Vue o
importam no ponto de entrada.

Isso torna a identidade **estrutural**: existe um único arquivo de cada, e
alterá-lo altera as três de uma só vez. `scripts/verify-shared.sh` guarda a
propriedade contra regressão, conferindo que nenhuma aplicação reintroduziu uma
cópia local e que todos os imports de núcleo resolvem para `shared/core/`.

**Ao alterar qualquer regra ou texto, edite `shared/core/`** — e rode a suíte
funcional depois, já que a mudança atinge as três ao mesmo tempo.

---

## A aplicação

Uma tela, sem backend, sem banco, sem chamadas HTTP e sem persistência. Toda a
operação acontece em memória.

**Entidade.** `id` numérico, `title` (obrigatório, até 75 caracteres),
`description` (opcional, até 500), `completed`, `createdAt` e `updatedAt`.

**Operações.** Listar, adicionar, atualizar, remover, marcar e desmarcar como
concluída, além dos indicadores de total, concluídas e pendentes.

**Dados iniciais.** Exatamente 1000 registros gerados deterministicamente (PRNG
mulberry32, semente `20250101`): 341 concluídas e 659 pendentes.

**Estrutura de componentes**, idêntica nas três:

```
App
├── TaskForm     formulário de criação/edição, erros e mensagens de sucesso
├── TaskStats    total, concluídas, pendentes
└── TaskList     lista ou estado vazio
    └── TaskItem uma tarefa, com Editar, Excluir e Concluir/Desmarcar
```

O contrato completo está em [`shared/specification.md`](shared/specification.md).

---

## Comandos

Todos rodam dentro do container. O prefixo `docker compose run --rm tcc` foi
omitido nas linhas abaixo por brevidade.

### Ambiente

| Comando | O que faz |
| --- | --- |
| `npm run install:all` | Instala as dependências da raiz e das três aplicações (`npm ci` quando há lock) |
| `npm run verify:shared` | Confirma que as três usam o mesmo arquivo de `shared/core/` |

### Execução manual no navegador

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe as três em modo de desenvolvimento (5173, 5174, 5175) |
| `npm run dev:react` / `dev:angular` / `dev:vue` | Sobe apenas uma delas |
| `npm run preview` | Serve os três builds de produção (4173, 4174, 4175) |
| `npm run preview:react` / `preview:angular` / `preview:vue` | Serve apenas um deles |

Estes comandos exigem `--service-ports` no `docker compose run`. Ver
[Abrir as aplicações no navegador](#abrir-as-aplicações-no-navegador).

### Verificação

| Comando | O que faz |
| --- | --- |
| `npm run verify:dataset` | Confirma que o gerador reproduz `shared/dataset.json` |
| `npm run verify:visual` | Compara geometria, tipografia e cores de cada elemento nas três |
| `npm run test:e2e` | Roda os 13 casos de teste nas três (39 execuções) |

### Medição

| Comando | Saída |
| --- | --- |
| `npm run build:all` | Compila as três em modo de produção, com cache limpo |
| `npm run measure:build` | `results/raw/build-times.csv`, `build-sizes.csv` |
| `npm run measure:runtime` | `results/raw/runtime.csv`, `memory.csv` |
| `npm run measure:loc` | `results/raw/loc.csv` |
| `npm run measure:deps` | `results/raw/dependencies.csv` |

### Coleta e análise

| Comando | O que faz |
| --- | --- |
| `npm run collect` | Executa as dez etapas da coleta, com as pré-condições de validade |
| `npm run analyze` | Refaz toda a estatística a partir de `results/raw/`, inclusive a verificação de independência e a análise de sensibilidade, e gera o `results/processed/summary.md` |
| `npm run experiment` | `collect` seguido de `analyze` |

### Parâmetros

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `REPETITIONS` | 30 | repetições medidas por métrica |
| `WARMUP` | 2 | repetições descartadas antes de medir |

Para a coleta definitiva:

```bash
docker compose run --rm tcc npm run experiment
```

---

## Abrir as aplicações no navegador

Não é preciso entrar em cada pasta nem rodar nada à mão: um comando sobe uma ou
as três de uma vez, cada uma na sua porta.

O `--service-ports` é o que publica as portas do container na sua máquina — sem
ele o navegador não alcança nada.

### As três ao mesmo tempo

```bash
# desenvolvimento, com recarga automática
docker compose run --rm --service-ports tcc npm run dev

# builds de produção (compila o que ainda não estiver compilado)
docker compose run --rm --service-ports tcc npm run preview
```

E abra no navegador:

| Aplicação | Desenvolvimento | Produção |
| --- | --- | --- |
| React | http://localhost:5173 | http://localhost:4173 |
| Vue | http://localhost:5174 | http://localhost:4174 |
| Angular | http://localhost:5175 | http://localhost:4175 |

Os logs das três aparecem juntos, prefixados por `[react]`, `[vue]` e
`[angular]`. `Ctrl+C` derruba todas de uma vez.

### Uma de cada vez

```bash
docker compose run --rm --service-ports tcc npm run dev:react
docker compose run --rm --service-ports tcc npm run dev:angular
docker compose run --rm --service-ports tcc npm run dev:vue
```

O mesmo vale para produção: `preview:react`, `preview:angular`, `preview:vue`.

### Qual dos dois modos usar

**Desenvolvimento** (`dev`) recompila ao salvar um arquivo — é o modo para
mexer no código. Não serve para avaliar desempenho: o código não é otimizado e
cada framework usa um servidor de desenvolvimento diferente.

**Produção** (`preview`) serve exatamente o artefato que o experimento mede,
pelo mesmo servidor estático nas três. É o modo para conferir visualmente o que
os números descrevem.

---

## O que é medido

| Métrica | Como |
| --- | --- |
| Tempo de compilação | `npm run build` completo, com todos os caches limpos antes de cada repetição |
| Tamanho do build | cada arquivo de `dist/`, bruto e comprimido com gzip |
| Carga inicial | navegação até os 1000 registros estarem no DOM e pintados |
| Adicionar / atualizar / remover / alternar | do clique até a mudança aparecer na tela |
| Memória | `JSHeapUsedSize`, nós do DOM e ouvintes, após a carga |
| Linhas de código | cloc, separando o núcleo compartilhado do código de framework |
| Dependências | diretas, transitivas e tamanho de `node_modules` |

O cronômetro roda dentro da página, e um `MutationObserver` instalado antes do
clique detecta a atualização com precisão de microtarefa. **Nenhuma linha de
código de medição existe dentro das aplicações**: tudo é injetado pelo
Playwright, identicamente nas três.

Detalhes em [`docs/measurement-protocol.md`](docs/measurement-protocol.md).

---

## Como a comparação é mantida justa

**Um único núcleo, sem cópias.** As três importam os mesmos arquivos de
`shared/core/`, então as regras de negócio, os textos e o CSS são idênticos por
construção, e não por sincronização.

**Pré-condições verificadas a cada coleta.** A coleta é interrompida se alguma
aplicação deixar de usar o núcleo compartilhado, se o gerador não reproduzir o
dataset canônico, se qualquer um dos 13 casos de teste falhar em qualquer
framework, ou se a verificação visual acusar divergência.

**Equivalência visual verificada elemento a elemento.** Os 10776 elementos
renderizados têm a mesma geometria, tipografia, cor e `display` nas três
implementações, em 1280x900 e em 375x800. A verificação não usa comparação de
captura de tela: a rasterização de texto do Chromium headless não é
determinística e acusaria diferenças inexistentes (ver
[D-16](docs/implementation-decisions.md)).

**Mesma camada de entrega.** As três são servidas pelo mesmo servidor estático
sem dependências (`scripts/serve-static.mjs`), a partir do build de produção,
com `Cache-Control: no-store`. O Angular não tem equivalente a `vite preview`, e
usar servidores diferentes colocaria uma variável não controlada exatamente na
camada medida.

**Mesmo compilador, mesmo empacotador, mesmo alvo.** TypeScript 6.0.3, Vite
7.3.2 e ES2022 nas três, com o mesmo nível de rigor de verificação de tipos.

**Scaffold normalizado.** Os geradores oficiais produzem ferramental acessório
diferente — o template React trazia ESLint, o Angular trazia Prettier, o Vue não
trazia nenhum. Tudo isso foi removido das três, junto com `@angular/router` e
`@angular/forms`, que não têm contrapartida em React e Vue.

**Sem otimização assimétrica.** Nenhuma memoização manual em nenhuma das três:
sem `React.memo`, sem `OnPush` explícito, sem `shallowRef`. Isso mede o
comportamento **padrão** de cada framework sob a mesma arquitetura — uma escolha
metodológica declarada, com suas limitações, em
[D-11](docs/implementation-decisions.md).

**Isolamento entre repetições.** Contexto de navegador novo a cada repetição,
sem cache e sem estado herdado.

---

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [`shared/specification.md`](shared/specification.md) | O contrato funcional que as três cumprem |
| [`shared/test-cases.md`](shared/test-cases.md) | Os 13 casos de teste e sua cobertura |
| [`docs/implementation-decisions.md`](docs/implementation-decisions.md) | Cada decisão tomada e sua justificativa |
| [`docs/measurement-protocol.md`](docs/measurement-protocol.md) | O que é medido, como, e as ameaças à validade |
| [`docs/reproducibility.md`](docs/reproducibility.md) | Passo a passo para reconstruir o ambiente |
| [`results/README.md`](results/README.md) | Formato dos dados e como interpretá-los |

---

## Licença

MIT.
