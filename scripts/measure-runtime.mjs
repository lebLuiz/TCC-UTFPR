#!/usr/bin/env node
/**
 * =============================================================================
 * Medicao de desempenho em tempo de execucao das tres aplicacoes.
 * =============================================================================
 *
 * O que e medido, por operacao:
 *   carga-inicial  navegacao ate os 1000 registros estarem no DOM e pintados
 *   adicionar      clique em "Adicionar tarefa" ate a lista ter 1001 itens
 *   atualizar      clique em "Salvar alteracoes" ate o titulo mudar na lista
 *   remover        clique em "Excluir" ate a lista ter 999 itens
 *   alternar       clique em "Concluir" ate o status do item mudar
 *
 * Como e medido:
 *   - O cronometro roda DENTRO da pagina (`performance.now()`), nunca no
 *     processo do Node, para nao incluir latencia de comunicacao com o
 *     navegador na medida.
 *   - Um `MutationObserver` instalado ANTES do clique detecta a atualizacao do
 *     DOM com precisao de microtarefa. Uma espera em `requestAnimationFrame` +
 *     `setTimeout` acrescenta o instante posterior a pintura.
 *   - Sao gravados dois tempos por repeticao: ate o DOM e ate a pintura.
 *
 * Controles contra vies:
 *   - Nenhum codigo de medicao vive dentro das aplicacoes. Tudo e injetado
 *     pelo Playwright, identicamente nas tres.
 *   - Cada repeticao usa um contexto de navegador novo, sem cache e sem estado
 *     herdado da repeticao anterior.
 *   - As tres aplicacoes sao servidas pelo mesmo servidor estatico, com
 *     `Cache-Control: no-store`.
 *   - As primeiras rodadas (aquecimento) sao descartadas.
 *   - A coleta e intercalada por rodadas: cada rodada mede uma repeticao de
 *     cada metrica em cada aplicacao, e a ordem das aplicacoes e das metricas
 *     e sorteada a cada rodada. Sem isso, uma deriva do ambiente ao longo da
 *     coleta incidiria sempre sobre a mesma aplicacao e ficaria confundida com
 *     o efeito do framework.
 *   - O sorteio usa gerador com semente fixa, de modo que a ordem seja
 *     reproduzivel e auditavel. A ordem efetiva e gravada em
 *     execution-order.csv.
 *
 * Saida: results/raw/runtime.csv, results/raw/memory.csv e
 *        results/raw/execution-order.csv
 *
 * Variaveis de ambiente:
 *   REPETITIONS  rodadas medidas            (padrao: 30)
 *   WARMUP       rodadas descartadas antes  (padrao: 2)
 *   SEED         semente da aleatorizacao   (padrao: 20261026)
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = resolve(ROOT, 'results/raw');

const REPETITIONS = Number.parseInt(process.env.REPETITIONS ?? '30', 10);
const WARMUP = Number.parseInt(process.env.WARMUP ?? '2', 10);

// Semente da aleatorizacao da ordem de execucao. O valor padrao e a data do
// pre-registro das hipoteses (docs/hypotheses.md). Fixa-la permite que a mesma
// sequencia de sorteios seja reproduzida por quem repetir o experimento.
const SEED = Number.parseInt(process.env.SEED ?? '20261026', 10);

const TOTAL_INICIAL = 1000;

const APPS = [
  { nome: 'react', dir: 'react-app', porta: 4173 },
  { nome: 'angular', dir: 'angular-app', porta: 4175 },
  { nome: 'vue', dir: 'vue-app', porta: 4174 },
];

const METRICAS = ['carga-inicial', 'adicionar', 'atualizar', 'remover', 'alternar'];

// -----------------------------------------------------------------------------
// Servidor estatico
// -----------------------------------------------------------------------------

async function iniciarServidor(app) {
  const processo = spawn(
    process.execPath,
    [resolve(ROOT, 'scripts/serve-static.mjs'), resolve(ROOT, app.dir, 'dist'), String(app.porta)],
    { cwd: ROOT, stdio: 'ignore' },
  );

  const limite = Date.now() + 30_000;
  for (;;) {
    try {
      const resposta = await fetch(`http://127.0.0.1:${app.porta}/index.html`);
      if (resposta.ok) {
        return processo;
      }
    } catch {
      // servidor ainda subindo
    }
    if (Date.now() > limite) {
      processo.kill();
      throw new Error(`O servidor de ${app.nome} nao respondeu na porta ${app.porta}.`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

// -----------------------------------------------------------------------------
// Codigo injetado na pagina
// -----------------------------------------------------------------------------

/**
 * Instalado antes de qualquer script da aplicacao. Registra o instante em que
 * os 1000 registros aparecem no DOM e o instante logo apos a pintura seguinte.
 */
const OBSERVADOR_DE_CARGA = `
window.__tcc = { dom: null, pintura: null };
const alvo = ${TOTAL_INICIAL};
const pronto = () =>
  document.querySelectorAll('[data-testid="task-item"]').length >= alvo;
const observador = new MutationObserver(() => {
  if (window.__tcc.dom === null && pronto()) {
    window.__tcc.dom = performance.now();
    observador.disconnect();
    requestAnimationFrame(() => {
      setTimeout(() => { window.__tcc.pintura = performance.now(); }, 0);
    });
  }
});
observador.observe(document, { childList: true, subtree: true });
`;

/**
 * Executado dentro da pagina. Cronometra um clique ate o DOM satisfazer a
 * condicao informada e ate a pintura seguinte.
 *
 * `condicao` chega como texto porque funcoes nao atravessam a fronteira entre
 * o Node e o navegador.
 */
async function medirClique({ seletor, condicao }) {
  const avaliar = new Function(`return (${condicao});`)();

  const alvo = document.querySelector(seletor);
  if (alvo === null) {
    throw new Error(`Elemento nao encontrado: ${seletor}`);
  }

  let concluir;
  const atualizado = new Promise((r) => {
    concluir = r;
  });

  const observador = new MutationObserver(() => {
    if (avaliar()) {
      observador.disconnect();
      concluir();
    }
  });
  observador.observe(document.body, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  const inicio = performance.now();
  alvo.click();

  // Frameworks que atualizam de forma sincrona ja satisfazem a condicao aqui,
  // antes de o observador disparar.
  if (avaliar()) {
    observador.disconnect();
    concluir();
  }

  await atualizado;
  const tempoDom = performance.now() - inicio;

  await new Promise((r) => {
    requestAnimationFrame(() => setTimeout(r, 0));
  });
  const tempoPintura = performance.now() - inicio;

  return { tempoDom, tempoPintura };
}

/**
 * Escreve um valor em um campo e dispara o evento `input` nativo.
 *
 * Atribuir `.value` diretamente nao notifica o React, que rastreia o valor
 * anterior do no. Usar o setter do prototipo e disparar o evento funciona
 * identicamente nos tres frameworks.
 */
async function preencherCampo({ seletor, valor }) {
  const campo = document.querySelector(seletor);
  const prototipo =
    campo instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototipo, 'value').set;
  setter.call(campo, valor);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => {
    requestAnimationFrame(() => setTimeout(r, 0));
  });
}

async function estabilizar() {
  await new Promise((r) => {
    requestAnimationFrame(() => setTimeout(r, 0));
  });
}

// -----------------------------------------------------------------------------
// Definicao das operacoes medidas
// -----------------------------------------------------------------------------

const TITULO_MEDIDO = 'Tarefa medida pelo experimento';
const TITULO_ATUALIZADO = 'Titulo atualizado pelo experimento';

const SEL_ITEM = '[data-testid="task-item"]';
const SEL_PRIMEIRO_TITULO = '[data-testid="task-item"] [data-testid="task-item-title"]';
const SEL_PRIMEIRO_STATUS = '[data-testid="task-item"] [data-testid="task-item-status"]';

/**
 * Cada operacao define uma preparacao (fora do cronometro) e o clique medido.
 */
const OPERACOES = {
  adicionar: {
    async preparar(page) {
      await page.evaluate(preencherCampo, {
        seletor: '[data-testid="task-title-input"]',
        valor: TITULO_MEDIDO,
      });
    },
    clique: {
      seletor: '[data-testid="add-task-button"]',
      condicao: `() => document.querySelectorAll('${SEL_ITEM}').length === ${TOTAL_INICIAL + 1}`,
    },
  },

  atualizar: {
    async preparar(page) {
      // Entra em modo de edicao na primeira tarefa e troca o titulo.
      await page.evaluate(async () => {
        document.querySelector('[data-testid="edit-task-button"]').click();
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      });
      await page.evaluate(preencherCampo, {
        seletor: '[data-testid="task-title-input"]',
        valor: TITULO_ATUALIZADO,
      });
      await page.evaluate(estabilizar);
    },
    clique: {
      seletor: '[data-testid="save-task-button"]',
      condicao: `() => document.querySelector('${SEL_PRIMEIRO_TITULO}')?.textContent?.trim() === '${TITULO_ATUALIZADO}'`,
    },
  },

  remover: {
    async preparar() {
      // Nenhuma preparacao: remove a primeira tarefa da lista intacta.
    },
    clique: {
      seletor: '[data-testid="delete-task-button"]',
      condicao: `() => document.querySelectorAll('${SEL_ITEM}').length === ${TOTAL_INICIAL - 1}`,
    },
  },

  alternar: {
    async preparar() {
      // A primeira tarefa do dataset e pendente; o clique a marca como concluida.
    },
    clique: {
      seletor: '[data-testid="toggle-task-button"]',
      condicao: `() => document.querySelector('${SEL_PRIMEIRO_STATUS}')?.textContent?.trim() === 'Concluída'`,
    },
  },
};

// -----------------------------------------------------------------------------
// Execucao
// -----------------------------------------------------------------------------

/** Abre uma pagina nova, sem cache, e espera os 1000 registros aparecerem. */
async function abrirPagina(navegador, app) {
  const contexto = await navegador.newContext({
    bypassCSP: false,
    viewport: { width: 1280, height: 900 },
  });
  const page = await contexto.newPage();
  await page.addInitScript(OBSERVADOR_DE_CARGA);
  await page.goto(`http://127.0.0.1:${app.porta}/`, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__tcc?.pintura !== null, undefined, {
    timeout: 60_000,
  });
  return { contexto, page };
}


// -----------------------------------------------------------------------------
// Ordem de execucao aleatorizada e reproduzivel
// -----------------------------------------------------------------------------

/**
 * Gerador congruencial de 32 bits (mulberry32). Usado em vez de Math.random
 * porque a ordem de execucao precisa ser reproduzivel: quem repetir o
 * experimento com a mesma SEED obtem a mesma sequencia de sorteios, e a ordem
 * deixa de ser um detalhe nao auditavel da coleta.
 */
function criarGerador(semente) {
  let estado = semente >>> 0;
  return function proximo() {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Embaralhamento de Fisher-Yates sobre uma copia, sem alterar a entrada. */
function embaralhar(itens, aleatorio) {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// -----------------------------------------------------------------------------
// Execucao principal
// -----------------------------------------------------------------------------

/**
 * Mede uma unica repeticao de uma metrica em uma aplicacao.
 *
 * Retorna os tempos e, no caso da carga inicial, tambem a leitura de memoria.
 * Cada chamada abre um contexto novo do navegador e o fecha ao final, de modo
 * que nenhuma repeticao herda cache, heap ou estado de outra.
 */
async function medirRepeticao(navegador, app, metrica) {
  const { contexto, page } = await abrirPagina(navegador, app);

  try {
    if (metrica === 'carga-inicial') {
      const marcas = await page.evaluate(() => window.__tcc);

      const sessao = await contexto.newCDPSession(page);
      await sessao.send('Performance.enable');
      const { metrics } = await sessao.send('Performance.getMetrics');
      const ler = (nome) => metrics.find((m) => m.name === nome)?.value ?? 0;

      return {
        tempoDom: marcas.dom,
        tempoPintura: marcas.pintura,
        memoria: {
          heap: Math.round(ler('JSHeapUsedSize')),
          nos: Math.round(ler('Nodes')),
          ouvintes: Math.round(ler('JSEventListeners')),
        },
      };
    }

    const operacao = OPERACOES[metrica];
    await operacao.preparar(page);
    const resultado = await page.evaluate(medirClique, operacao.clique);

    return {
      tempoDom: resultado.tempoDom,
      tempoPintura: resultado.tempoPintura,
      memoria: null,
    };
  } finally {
    await contexto.close();
  }
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });

  const aleatorio = criarGerador(SEED);

  // Registros acumulados em memoria. O CSV e ordenado na gravacao, para que o
  // esquema e a ordem das linhas permanecam iguais aos da versao anterior e o
  // analyze-results.py nao precise de alteracao. A ordem real de execucao e
  // preservada em execution-order.csv.
  const registrosTempo = [];
  const registrosMemoria = [];
  const registrosOrdem = [];
  const amostras = new Map(); // "app|metrica" -> number[]

  const navegador = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });

  // Os tres servidores sobem juntos e permanecem ativos durante toda a coleta.
  // Sao servidores estaticos: ficam ociosos entre requisicoes e nao disputam
  // CPU com a aplicacao sob medicao. Mante-los ativos e o que torna possivel
  // alternar de framework a cada rodada sem custo de reinicializacao.
  const servidores = [];

  console.log(
    `Coleta intercalada: ${WARMUP + REPETITIONS} rodadas ` +
      `(${WARMUP} de aquecimento + ${REPETITIONS} medidas), ` +
      `${APPS.length} aplicacoes x ${METRICAS.length} metricas por rodada.\n` +
      `Semente de aleatorizacao: ${SEED}\n`,
  );

  try {
    for (const app of APPS) {
      servidores.push(await iniciarServidor(app));
    }

    for (let rodada = 1; rodada <= WARMUP + REPETITIONS; rodada += 1) {
      const medindo = rodada > WARMUP;
      const repeticao = rodada - WARMUP;
      let posicao = 0;

      // A ordem das aplicacoes e das metricas e sorteada a cada rodada. Sem
      // isso, qualquer deriva do ambiente ao longo da coleta (aquecimento do
      // processador, variacao de carga do sistema) incide sempre na mesma
      // aplicacao e fica confundida com o efeito do framework.
      for (const app of embaralhar(APPS, aleatorio)) {
        for (const metrica of embaralhar(METRICAS, aleatorio)) {
          posicao += 1;

          const { tempoDom, tempoPintura, memoria } = await medirRepeticao(
            navegador,
            app,
            metrica,
          );

          if (!medindo) {
            continue;
          }

          registrosTempo.push({
            framework: app.nome,
            metrica,
            repeticao,
            tempoDom,
            tempoPintura,
          });

          registrosOrdem.push({ rodada: repeticao, posicao, framework: app.nome, metrica });

          if (memoria !== null) {
            registrosMemoria.push({ framework: app.nome, repeticao, ...memoria });
          }

          const chave = `${app.nome}|${metrica}`;
          if (!amostras.has(chave)) {
            amostras.set(chave, []);
          }
          amostras.get(chave).push(tempoPintura);
        }
      }

      const etiqueta = medindo ? `rodada ${repeticao}/${REPETITIONS}` : `aquecimento ${rodada}/${WARMUP}`;
      console.log(`${etiqueta} concluida`);
    }
  } finally {
    for (const servidor of servidores) {
      servidor.kill();
    }
    await navegador.close();
  }

  // Gravacao ordenada por aplicacao, metrica e repeticao.
  const indiceApp = (nome) => APPS.findIndex((a) => a.nome === nome);
  const indiceMetrica = (nome) => METRICAS.indexOf(nome);

  registrosTempo.sort(
    (a, b) =>
      indiceApp(a.framework) - indiceApp(b.framework) ||
      indiceMetrica(a.metrica) - indiceMetrica(b.metrica) ||
      a.repeticao - b.repeticao,
  );
  registrosMemoria.sort(
    (a, b) => indiceApp(a.framework) - indiceApp(b.framework) || a.repeticao - b.repeticao,
  );

  const linhasTempo = ['framework,metrica,repeticao,tempo_dom_ms,tempo_pintura_ms'];
  for (const r of registrosTempo) {
    linhasTempo.push(
      [r.framework, r.metrica, r.repeticao, r.tempoDom.toFixed(3), r.tempoPintura.toFixed(3)].join(
        ',',
      ),
    );
  }

  const linhasMemoria = ['framework,repeticao,heap_bytes,nos_dom,ouvintes'];
  for (const r of registrosMemoria) {
    linhasMemoria.push([r.framework, r.repeticao, r.heap, r.nos, r.ouvintes].join(','));
  }

  const linhasOrdem = ['rodada,posicao,framework,metrica'];
  for (const r of registrosOrdem) {
    linhasOrdem.push([r.rodada, r.posicao, r.framework, r.metrica].join(','));
  }

  writeFileSync(resolve(RAW_DIR, 'runtime.csv'), linhasTempo.join('\n') + '\n');
  writeFileSync(resolve(RAW_DIR, 'memory.csv'), linhasMemoria.join('\n') + '\n');
  writeFileSync(resolve(RAW_DIR, 'execution-order.csv'), linhasOrdem.join('\n') + '\n');

  console.log('\nResumo (tempo ate a pintura):\n');
  for (const app of APPS) {
    for (const metrica of METRICAS) {
      const valores = amostras.get(`${app.nome}|${metrica}`) ?? [];
      if (!valores.length)
        continue;

      const media = valores.reduce((a, b) => a + b, 0) / valores.length;
      const ordenadas = [...valores].sort((a, b) => a - b);
      const mediana = ordenadas[Math.floor(ordenadas.length / 2)];
      console.log(
        `${app.nome.padEnd(8)} ${metrica.padEnd(14)} ` +
          `media ${media.toFixed(2).padStart(9)} ms   mediana ${mediana.toFixed(2).padStart(9)} ms   n=${valores.length}`,
      );
    }
  }

  console.log(`\nTempos gravados em results/raw/runtime.csv`);
  console.log(`Memoria gravada em results/raw/memory.csv`);
  console.log(`Ordem de execucao gravada em results/raw/execution-order.csv`);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
