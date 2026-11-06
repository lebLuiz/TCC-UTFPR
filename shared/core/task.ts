/**
 * NOTE: Núcleo compartilhado: entidade Tarefa, regras de validação e mensagens.
 *
 * As três aplicações importam ESTE arquivo diretamente; não existem cópias.
 * Alterar qualquer regra ou texto aqui altera as três de uma só vez, o que
 * torna a identidade estrutural em vez de depender de sincronização.
 * `scripts/verify-shared.sh` guarda essa propriedade contra regressão.
 *
 * Este arquivo NÃO importa nada de React, Angular ou Vue: a comparação precisa
 * medir o framework, não a lógica de domínio.
 */

export interface Task {
  id: number;
  /** Título obrigatório (1..75 caracteres após trim). */
  title: string;
  /** Descrição opcional (0..500 caracteres após trim). String vazia = ausente. */
  description: string;
  completed: boolean;
  /** Data e hora de criação, em ISO 8601 UTC. */
  createdAt: string;
  /** Data e hora da última atualização, em ISO 8601 UTC. */
  updatedAt: string;
}

/** Campos editáveis pelo formulário. */
export interface TaskDraft {
  title: string;
  description: string;
  completed: boolean;
}

// -----------------------------------------------------------------------------
// Limites de validação (idênticos nas três implementações)
// -----------------------------------------------------------------------------

export const TITLE_MAX_LENGTH = 75;
export const DESCRIPTION_MAX_LENGTH = 500;

// -----------------------------------------------------------------------------
// Mensagens da interface (idênticas nas três implementações)
// -----------------------------------------------------------------------------

export const MESSAGES = {
  appTitle: 'Lista de Tarefas',
  formLegendCreate: 'Nova tarefa',
  formLegendEdit: 'Editar tarefa',
  labelTitle: 'Título',
  labelDescription: 'Descrição',
  labelCompleted: 'Concluída',
  placeholderTitle: 'Digite o título da tarefa',
  placeholderDescription: 'Digite a descrição da tarefa (opcional)',
  buttonAdd: 'Adicionar tarefa',
  buttonSave: 'Salvar alterações',
  buttonCancel: 'Cancelar edição',
  buttonEdit: 'Editar',
  buttonDelete: 'Excluir',
  buttonComplete: 'Concluir',
  buttonUncomplete: 'Desmarcar',
  statsTotal: 'Total de tarefas',
  statsCompleted: 'Tarefas concluídas',
  statsPending: 'Tarefas pendentes',
  emptyState: 'Nenhuma tarefa cadastrada.',
  errorTitleRequired: 'O título é obrigatório.',
  errorTitleTooLong: `O título deve ter no máximo ${TITLE_MAX_LENGTH} caracteres.`,
  errorDescriptionTooLong: `A descrição deve ter no máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`,
  successCreated: 'Tarefa adicionada com sucesso.',
  successUpdated: 'Tarefa atualizada com sucesso.',
  successDeleted: 'Tarefa removida com sucesso.',
  columnTitle: 'Tarefa',
  columnStatus: 'Status',
  columnUpdatedAt: 'Atualizada em',
  columnActions: 'Ações',
  statusCompleted: 'Concluída',
  statusPending: 'Pendente',
} as const;

/**
 * Valida um rascunho de tarefa.
 *
 * Retorna a mensagem do primeiro erro encontrado, na ordem:
 * título vazio -> título longo demais -> descrição longa demais.
 * Retorna `null` quando o rascunho é válido.
 *
 * A comparação de tamanho usa o valor após `trim()`, que é também o valor
 * efetivamente persistido, evitando divergência entre validação e gravação.
 */
export function validateDraft(draft: TaskDraft): string | null {
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (title.length === 0) {
    return MESSAGES.errorTitleRequired;
  }

  if (title.length > TITLE_MAX_LENGTH) {
    return MESSAGES.errorTitleTooLong;
  }

  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return MESSAGES.errorDescriptionTooLong;
  }

  return null;
}

// -----------------------------------------------------------------------------
// Operações puras sobre tarefas
// -----------------------------------------------------------------------------

export function emptyDraft(): TaskDraft {
  return { title: '', description: '', completed: false };
}

export function draftFromTask(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description,
    completed: task.completed,
  };
}

/** `now` é injetado para manter a função pura e testável. */
export function createTask(id: number, draft: TaskDraft, now: string): Task {
  return {
    id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    completed: draft.completed,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyDraft(task: Task, draft: TaskDraft, now: string): Task {
  return {
    ...task,
    title: draft.title.trim(),
    description: draft.description.trim(),
    completed: draft.completed,
    updatedAt: now,
  };
}

export function toggleTask(task: Task, now: string): Task {
  return { ...task, completed: !task.completed, updatedAt: now };
}

/** Timestamp corrente em ISO 8601 UTC. */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Formata um timestamp ISO para exibição: `DD/MM/AAAA HH:MM`.
 *
 * A formatação é feita manualmente a partir dos componentes UTC em vez de
 * `toLocaleString`, porque `Intl` depende do locale/timezone do ambiente e
 * produziria saídas diferentes entre máquinas, quebrando a comparação visual
 * e as asserções dos testes automatizados.
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, '0');
  const day = pad(date.getUTCDate());
  const month = pad(date.getUTCMonth() + 1);
  const year = date.getUTCFullYear();
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
