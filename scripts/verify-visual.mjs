#!/usr/bin/env node
/**
 * =============================================================================
 * Verifica a equivalência visual das três implementações.
 * =============================================================================
 *
 * Para cada elemento renderizado dentro de `.app`, compara entre React, Angular
 * e Vue:
 *
 *   - a tag e as classes CSS;
 *   - a caixa delimitadora (posição e tamanho, com uma casa decimal);
 *   - a tipografia computada (`font`);
 *   - a cor do texto, a cor de fundo e o `display`.
 *
 * Também compara a altura total da página e a quantidade de elementos e de
 * tarefas renderizadas. A checagem roda em duas larguras de viewport, para
 * cobrir também o comportamento responsivo.
 *
 * Por que não comparar capturas de tela pixel a pixel
 * ---------------------------------------------------
 * A rasterização de texto do Chromium headless não é bit a bit determinística:
 * capturas sucessivas da MESMA aplicação, do MESMO build, produzem hashes
 * diferentes por variação de antisserrilhado. Um hash de imagem, portanto,
 * acusaria diferença onde não há. A comparação de geometria e de estilo
 * computado é determinística e descreve exatamente o que precisa ser
 * equivalente.
 *
 * Uso: node scripts/verify-visual.mjs
 * Código de saída 1 se houver qualquer divergência.
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  { nome: 'react', dir: 'react-app', porta: 4173 },
  { nome: 'angular', dir: 'angular-app', porta: 4175 },
  { nome: 'vue', dir: 'vue-app', porta: 4174 },
];

const VIEWPORTS = [
  { nome: 'desktop', largura: 1280, altura: 900 },
  { nome: 'mobile', largura: 375, altura: 800 },
];

const MAX_DIVERGENCIAS_EXIBIDAS = 10;

/*
 * Tolerância de meio pixel na geometria. O cálculo de layout do navegador
 * produz frações que dependem da ordem das operações de ponto flutuante, e
 * diferenças abaixo de um pixel não podem ser exibidas na tela. Os demais
 * campos (tag, classes, tipografia, cores, display) são comparados exatamente.
 */
const TOLERANCIA_PX = 0.5;

async function iniciarServidor(app) {
  const processo = spawn(
    process.execPath,
    [resolve(ROOT, 'scripts/serve-static.mjs'), resolve(ROOT, app.dir, 'dist'), String(app.porta)],
    { cwd: ROOT, stdio: 'ignore' },
  );
  const limite = Date.now() + 30_000;
  for (;;) {
    try {
      if ((await fetch(`http://127.0.0.1:${app.porta}/index.html`)).ok) return processo;
    } catch {
      // ainda subindo
    }
    if (Date.now() > limite) {
      processo.kill();
      throw new Error(`O servidor de ${app.nome} nao respondeu na porta ${app.porta}.`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Coleta o descritor visual de cada elemento dentro de `.app`. */
function coletarDescritores() {
  const raiz = document.querySelector('.app');
  const descritores = [];
  for (const el of raiz.querySelectorAll('*')) {
    const caixa = el.getBoundingClientRect();
    const estilo = getComputedStyle(el);
    descritores.push({
      identidade: [
        el.tagName.toLowerCase(),
        el.getAttribute('class') ?? '-',
        el.getAttribute('data-testid') ?? '-',
        estilo.font,
        estilo.color,
        estilo.backgroundColor,
        estilo.display,
        estilo.textDecorationLine,
      ].join(' | '),
      caixa: [caixa.x, caixa.y, caixa.width, caixa.height],
    });
  }
  return {
    descritores,
    alturaPagina: document.documentElement.scrollHeight,
    totalElementos: raiz.querySelectorAll('*').length,
    totalTarefas: document.querySelectorAll('[data-testid="task-item"]').length,
  };
}

async function main() {
  const navegador = await chromium.launch({ headless: true });
  let divergencias = 0;

  try {
    for (const viewport of VIEWPORTS) {
      const coletado = {};

      for (const app of APPS) {
        const servidor = await iniciarServidor(app);
        try {
          const contexto = await navegador.newContext({
            viewport: { width: viewport.largura, height: viewport.altura },
          });
          const page = await contexto.newPage();
          await page.goto(`http://127.0.0.1:${app.porta}/`);
          await page.waitForFunction(
            () => document.querySelectorAll('[data-testid="task-item"]').length >= 1000,
            undefined,
            { timeout: 60_000 },
          );
          await page.evaluate(() => document.fonts.ready);
          coletado[app.nome] = await page.evaluate(coletarDescritores);
          await contexto.close();
        } finally {
          servidor.kill();
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      console.log(`\n=== ${viewport.nome} (${viewport.largura}x${viewport.altura}) ===`);

      const referencia = coletado.react;
      for (const chave of ['alturaPagina', 'totalElementos', 'totalTarefas']) {
        const valores = APPS.map((a) => coletado[a.nome][chave]);
        const iguais = new Set(valores).size === 1;
        if (!iguais) divergencias += 1;
        console.log(
          `  ${iguais ? 'OK     ' : 'DIVERGE'} ${chave.padEnd(16)} ` +
            (iguais ? valores[0] : APPS.map((a, i) => `${a.nome}=${valores[i]}`).join('  ')),
        );
      }

      let divergenciasElementos = 0;
      let exibidas = 0;
      const total = Math.max(...APPS.map((a) => coletado[a.nome].descritores.length));

      for (let i = 0; i < total; i += 1) {
        const valores = APPS.map((a) => coletado[a.nome].descritores[i] ?? null);

        const identidades = valores.map((v) => (v === null ? '(ausente)' : v.identidade));
        const identidadeDifere = new Set(identidades).size !== 1;

        const geometriaDifere = valores.some((v) =>
          v === null ||
          v.caixa.some((n, k) => Math.abs(n - valores[0].caixa[k]) > TOLERANCIA_PX),
        );

        if (!identidadeDifere && !geometriaDifere) continue;

        divergenciasElementos += 1;
        if (exibidas < MAX_DIVERGENCIAS_EXIBIDAS) {
          exibidas += 1;
          console.log(`\n  elemento ${i}:`);
          APPS.forEach((a, j) => {
            const v = valores[j];
            const caixa = v === null
              ? '(ausente)'
              : v.caixa.map((n) => n.toFixed(1)).join(',');
            console.log(`    ${a.nome.padEnd(8)} ${caixa} | ${identidades[j]}`);
          });
        }
      }

      if (divergenciasElementos === 0) {
        console.log(
          `  OK      ${String(referencia.descritores.length).padStart(5)} elementos ` +
            `idênticos em geometria, tipografia, cor e display`,
        );
      } else {
        divergencias += divergenciasElementos;
        console.log(
          `\n  DIVERGE ${divergenciasElementos} elemento(s) diferem ` +
            `(exibidos os ${Math.min(exibidas, MAX_DIVERGENCIAS_EXIBIDAS)} primeiros)`,
        );
      }
    }
  } finally {
    await navegador.close();
  }

  console.log('');
  if (divergencias === 0) {
    console.log('As três implementações são visualmente equivalentes nas duas larguras testadas.');
    return 0;
  }
  console.error(`${divergencias} divergência(s) visual(is) encontrada(s).`);
  return 1;
}

main().then(
  (codigo) => process.exit(codigo),
  (erro) => {
    console.error(erro);
    process.exit(1);
  },
);
