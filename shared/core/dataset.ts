/**
 * =============================================================================
 * Núcleo compartilhado: geração determinística do dataset inicial.
 * =============================================================================
 *
 * As três aplicações importam ESTE arquivo diretamente; não existem cópias,
 * de modo que o dataset inicial é o mesmo por construção.
 *
 * Por que gerar em vez de importar `shared/dataset.json`?
 * ------------------------------------------------------
 * Importar um JSON com 1000 registros embutiria cerca de 250 KB de dados
 * idênticos no bundle das três aplicações. Isso adicionaria uma constante ao
 * tamanho do build e comprimiria artificialmente a diferença relativa entre os
 * frameworks — justamente uma das métricas do experimento. Além disso, cada
 * bundler trata importação de JSON de forma própria (inline, asset separado,
 * tree-shaking), o que introduziria uma variável não controlada.
 *
 * A geração determinística mantém o bundle representativo do framework e o
 * custo de CPU idêntico nas três versões, porque o algoritmo é o mesmo arquivo.
 *
 * `shared/dataset.json` continua existindo como artefato canônico de
 * conferência: `scripts/verify-dataset.sh` compara a saída deste gerador com
 * aquele arquivo, e os testes o usam como valor esperado.
 *
 * Determinismo
 * ------------
 * O PRNG é o `mulberry32`, baseado apenas em aritmética inteira de 32 bits
 * (`Math.imul`, deslocamentos e XOR), operações exatas e idênticas em qualquer
 * motor JavaScript. Não há dependência de `Math.random`, de horário do sistema,
 * de locale ou de ordenação de chaves de objeto.
 */

import type { Task } from './task';

export const INITIAL_TASK_COUNT = 1000;

/** Semente fixa do gerador. Alterar este valor muda todo o dataset. */
export const DATASET_SEED = 20250101;

const BASE_TIME_MS = Date.UTC(2025, 0, 1, 0, 0, 0, 0);

const MINUTE_MS = 60_000;

/**
 * PRNG mulberry32: determinístico, rápido e sem estado global.
 * Retorna uma função que produz números em [0, 1).
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorteia um inteiro em [0, max). */
function randomInt(rng: () => number, max: number): number {
  return Math.floor(rng() * max);
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[randomInt(rng, items.length)];
}

// -----------------------------------------------------------------------------
// Vocabulário usado na montagem dos títulos e das descrições.
// As listas são fixas: qualquer alteração muda o dataset e invalida comparações
// com execuções anteriores do experimento.
// -----------------------------------------------------------------------------

const ACTIONS = [
  'Revisar',
  'Atualizar',
  'Preparar',
  'Enviar',
  'Validar',
  'Organizar',
  'Documentar',
  'Corrigir',
  'Publicar',
  'Arquivar',
  'Conferir',
  'Planejar',
] as const;

const OBJECTS = [
  'o relatório mensal',
  'a proposta comercial',
  'o cronograma do projeto',
  'a planilha de custos',
  'o manual do usuário',
  'a ata da reunião',
  'o contrato de serviço',
  'a lista de contatos',
  'o backup dos arquivos',
  'o inventário do estoque',
  'a apresentação institucional',
  'o formulário de cadastro',
] as const;

const CONTEXTS = [
  'do setor financeiro',
  'da equipe de suporte',
  'do time de desenvolvimento',
  'da diretoria',
  'do departamento jurídico',
  'da filial regional',
  'do cliente principal',
  'da auditoria interna',
] as const;

const DETAILS = [
  'Confirmar os dados com o responsável antes de prosseguir.',
  'Anexar os documentos comprobatórios ao registro.',
  'Verificar se a versão anterior foi devidamente arquivada.',
  'Alinhar o prazo de entrega com as partes envolvidas.',
  'Registrar as pendências encontradas durante a conferência.',
  'Solicitar aprovação formal antes da publicação.',
  'Comparar os valores com o período equivalente do ano anterior.',
  'Atualizar o histórico de alterações após a conclusão.',
] as const;

const PRIORITIES = ['Prioridade alta.', 'Prioridade média.', 'Prioridade baixa.'] as const;

/**
 * Gera o dataset inicial de forma determinística.
 *
 * Garantias:
 * - `id` sequencial de 1 até `count`;
 * - `title` com no máximo 75 caracteres (limite de validação da aplicação);
 * - `description` com no máximo 500 caracteres, vazia em ~25% dos registros;
 * - `completed` verdadeiro em ~35% dos registros;
 * - `createdAt` estritamente crescente;
 * - `updatedAt` sempre maior ou igual a `createdAt`.
 */
export function generateInitialTasks(
  count: number = INITIAL_TASK_COUNT,
  seed: number = DATASET_SEED,
): Task[] {
  const rng = createRng(seed);
  const tasks: Task[] = new Array<Task>(count);

  for (let index = 0; index < count; index += 1) {
    // Título: "<Ação> <objeto> <contexto>", truncado por segurança em 75.
    const title = `${pick(rng, ACTIONS)} ${pick(rng, OBJECTS)} ${pick(rng, CONTEXTS)}`.slice(0, 75);

    // Descrição: vazia em ~25% dos casos; caso contrário, detalhe + prioridade.
    const hasDescription = rng() >= 0.25;
    const description = hasDescription
      ? `${pick(rng, DETAILS)} ${pick(rng, PRIORITIES)}`.slice(0, 500)
      : '';

    const completed = rng() < 0.35;

    // Criação: avanço fixo de 7 minutos por registro mais um deslocamento
    // sorteado de até 6 minutos, mantendo a sequência estritamente crescente.
    const createdMs = BASE_TIME_MS + index * 7 * MINUTE_MS + randomInt(rng, 7) * MINUTE_MS;

    // Atualização: 0 minutos (nunca editada) ou até 72 horas após a criação.
    const updatedOffsetMinutes = rng() < 0.4 ? 0 : randomInt(rng, 72 * 60);
    const updatedMs = createdMs + updatedOffsetMinutes * MINUTE_MS;

    tasks[index] = {
      id: index + 1,
      title,
      description,
      completed,
      createdAt: new Date(createdMs).toISOString(),
      updatedAt: new Date(updatedMs).toISOString(),
    };
  }

  return tasks;
}

/**
 * Primeiro identificador livre depois do dataset inicial.
 * A estratégia de identificação é a mesma nas três aplicações: contador
 * incremental em memória, iniciado logo após o último registro do dataset.
 */
export const FIRST_GENERATED_ID = INITIAL_TASK_COUNT + 1;
