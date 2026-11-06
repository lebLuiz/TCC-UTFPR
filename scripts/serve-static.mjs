#!/usr/bin/env node
/**
 * =============================================================================
 * Servidor estatico minimo, sem dependencias externas.
 * =============================================================================
 *
 * Por que existe: o Vite oferece `vite preview`, mas o Angular nao tem comando
 * equivalente. Usar `vite preview` para React/Vue e outro servidor para Angular
 * introduziria uma variavel nao controlada (cabecalhos, compressao, cache,
 * HTTP/1.1 vs HTTP/2) justamente na camada que entrega os arquivos medidos.
 *
 * Este script serve o build de producao das tres aplicacoes exatamente da mesma
 * forma, usando apenas modulos nativos do Node.js. Assim, a unica diferenca
 * entre as medicoes e o artefato gerado por cada framework.
 *
 * Uso: node scripts/serve-static.mjs <diretorio> <porta> [host]
 *
 * O host padrao e 0.0.0.0 porque o servidor roda dentro do container: ligado
 * apenas a 127.0.0.1 ele ficaria inacessivel do navegador da maquina
 * hospedeira. Passe 127.0.0.1 como terceiro argumento (ou defina SERVE_HOST)
 * para restringir ao loopback.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const [, , rawDir, rawPort, rawHost] = process.argv;

if (rawDir === undefined || rawPort === undefined) {
  console.error('Uso: node scripts/serve-static.mjs <diretorio> <porta> [host]');
  process.exit(1);
}

const ROOT = resolve(process.cwd(), rawDir);
const PORT = Number.parseInt(rawPort, 10);
const HOST = rawHost ?? process.env.SERVE_HOST ?? '0.0.0.0';

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.png', 'image/png'],
  ['.woff2', 'font/woff2'],
  ['.map', 'application/json; charset=utf-8'],
]);

/** Resolve o caminho pedido para um arquivo dentro de ROOT, sem permitir escapar. */
function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(ROOT, relative);
  if (candidate !== ROOT && !candidate.startsWith(ROOT + sep)) {
    return null;
  }
  return candidate;
}

const server = createServer(async (request, response) => {
  const candidate = resolveRequestPath(request.url ?? '/');

  if (candidate === null) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let filePath = candidate;

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      await stat(filePath);
    }
  } catch {
    // Aplicacao de pagina unica: qualquer rota desconhecida cai no index.html.
    filePath = join(ROOT, 'index.html');
    try {
      await stat(filePath);
    } catch {
      response.writeHead(404).end('Not Found');
      return;
    }
  }

  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
    // Cache desligado: cada medicao deve partir das mesmas condicoes, sem que
    // uma execucao anterior beneficie a seguinte.
    'Cache-Control': 'no-store',
  });

  createReadStream(filePath).pipe(response);
});

server.listen(PORT, HOST, () => {
  const acessivelEm = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`Servindo ${ROOT} em http://${acessivelEm}:${PORT}`);
});
