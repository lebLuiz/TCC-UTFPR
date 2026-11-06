import { expect, test } from '@playwright/test';

import {
  COMPLETED,
  FIRST,
  LAST,
  PENDING,
  TOTAL,
} from '../fixtures/expected-dataset.mjs';

/**
 * =============================================================================
 * Casos de teste funcionais — executados identicamente nas três aplicações.
 * =============================================================================
 *
 * A especificação em prosa está em `shared/test-cases.md`. Os identificadores
 * CT-XX abaixo correspondem um a um àquele documento.
 *
 * Todos os seletores usam os atributos `data-testid` definidos em
 * `shared/specification.md`, que são idênticos nas três implementações.
 */

const TITULO_MAX = 75;
const DESCRICAO_MAX = 500;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // A lista só é considerada pronta quando os 1000 registros estão no DOM.
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
});

test('CT-01: carrega o dataset inicial com 1000 registros e indicadores corretos', async ({
  page,
}) => {
  await expect(page.getByTestId('app-title')).toHaveText('Lista de Tarefas');
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
  await expect(page.getByTestId('completed-count')).toHaveText(String(COMPLETED));
  await expect(page.getByTestId('pending-count')).toHaveText(String(PENDING));
  await expect(page.getByTestId('task-item')).toHaveCount(TOTAL);
});

test('CT-02: o primeiro e o último registro conferem com shared/dataset.json', async ({
  page,
}) => {
  const primeiro = page.getByTestId('task-item').first();
  await expect(primeiro.getByTestId('task-item-title')).toHaveText(FIRST.title);
  await expect(primeiro).toHaveAttribute('data-task-id', String(FIRST.id));

  const ultimo = page.getByTestId('task-item').last();
  await expect(ultimo.getByTestId('task-item-title')).toHaveText(LAST.title);
  await expect(ultimo).toHaveAttribute('data-task-id', String(LAST.id));
});

test('CT-03: adiciona uma tarefa válida', async ({ page }) => {
  await page.getByTestId('task-title-input').fill('Tarefa de teste automatizado');
  await page.getByTestId('task-description-input').fill('Descrição de teste.');
  await page.getByTestId('add-task-button').click();

  await expect(page.getByTestId('success-message')).toHaveText(
    'Tarefa adicionada com sucesso.',
  );
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL + 1));
  await expect(page.getByTestId('pending-count')).toHaveText(String(PENDING + 1));

  // A tarefa nova é acrescentada ao final da lista e recebe o id 1001.
  const novo = page.getByTestId('task-item').last();
  await expect(novo.getByTestId('task-item-title')).toHaveText('Tarefa de teste automatizado');
  await expect(novo.getByTestId('task-item-description')).toHaveText('Descrição de teste.');
  await expect(novo).toHaveAttribute('data-task-id', '1001');

  // O formulário volta ao estado inicial.
  await expect(page.getByTestId('task-title-input')).toHaveValue('');
  await expect(page.getByTestId('task-description-input')).toHaveValue('');
});

test('CT-04: adiciona uma tarefa já marcada como concluída', async ({ page }) => {
  await page.getByTestId('task-title-input').fill('Tarefa já concluída');
  await page.getByTestId('task-completed-input').check();
  await page.getByTestId('add-task-button').click();

  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL + 1));
  await expect(page.getByTestId('completed-count')).toHaveText(String(COMPLETED + 1));
  await expect(page.getByTestId('task-item').last().getByTestId('task-item-status')).toHaveText(
    'Concluída',
  );
  // A caixa de seleção volta ao estado padrão após o envio.
  await expect(page.getByTestId('task-completed-input')).not.toBeChecked();
});

test('CT-05: rejeita título vazio e não altera a lista', async ({ page }) => {
  await page.getByTestId('add-task-button').click();

  await expect(page.getByTestId('error-message')).toHaveText('O título é obrigatório.');
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
  await expect(page.getByTestId('success-message')).toHaveCount(0);
});

test('CT-06: rejeita título composto apenas por espaços', async ({ page }) => {
  await page.getByTestId('task-title-input').fill('     ');
  await page.getByTestId('add-task-button').click();

  await expect(page.getByTestId('error-message')).toHaveText('O título é obrigatório.');
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
});

test('CT-07: respeita os limites de tamanho dos campos', async ({ page }) => {
  const titulo = page.getByTestId('task-title-input');
  const descricao = page.getByTestId('task-description-input');

  await expect(titulo).toHaveAttribute('maxlength', String(TITULO_MAX));
  await expect(descricao).toHaveAttribute('maxlength', String(DESCRICAO_MAX));

  await titulo.fill('A'.repeat(TITULO_MAX + 30));
  await expect(titulo).toHaveValue('A'.repeat(TITULO_MAX));

  await descricao.fill('B'.repeat(DESCRICAO_MAX + 60));
  await expect(descricao).toHaveValue('B'.repeat(DESCRICAO_MAX));
});

test('CT-08: edita uma tarefa existente', async ({ page }) => {
  const primeiro = page.getByTestId('task-item').first();
  await primeiro.getByTestId('edit-task-button').click();

  // Em modo de edição o formulário troca os botões e carrega os valores.
  await expect(page.getByTestId('save-task-button')).toBeVisible();
  await expect(page.getByTestId('cancel-edit-button')).toBeVisible();
  await expect(page.getByTestId('add-task-button')).toHaveCount(0);
  await expect(page.getByTestId('task-title-input')).toHaveValue(FIRST.title);

  await page.getByTestId('task-title-input').fill('Título alterado pelo teste');
  await page.getByTestId('save-task-button').click();

  await expect(page.getByTestId('success-message')).toHaveText('Tarefa atualizada com sucesso.');
  await expect(primeiro.getByTestId('task-item-title')).toHaveText('Título alterado pelo teste');
  // Editar não cria nem remove registros.
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
  // O formulário volta ao modo de criação.
  await expect(page.getByTestId('add-task-button')).toBeVisible();
  await expect(page.getByTestId('cancel-edit-button')).toHaveCount(0);
});

test('CT-09: cancela a edição sem alterar a tarefa', async ({ page }) => {
  const primeiro = page.getByTestId('task-item').first();
  await primeiro.getByTestId('edit-task-button').click();
  await page.getByTestId('task-title-input').fill('Alteração que será descartada');
  await page.getByTestId('cancel-edit-button').click();

  await expect(page.getByTestId('add-task-button')).toBeVisible();
  await expect(page.getByTestId('task-title-input')).toHaveValue('');
  await expect(primeiro.getByTestId('task-item-title')).toHaveText(FIRST.title);
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL));
});

test('CT-10: remove uma tarefa', async ({ page }) => {
  const primeiro = page.getByTestId('task-item').first();
  await primeiro.getByTestId('delete-task-button').click();

  await expect(page.getByTestId('success-message')).toHaveText('Tarefa removida com sucesso.');
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL - 1));
  // O registro seguinte passa a ocupar a primeira posição.
  await expect(page.getByTestId('task-item').first()).toHaveAttribute('data-task-id', '2');
});

test('CT-11: marca e desmarca uma tarefa como concluída', async ({ page }) => {
  // O primeiro registro do dataset é pendente; usamos ele para ida e volta.
  expect(FIRST.completed).toBe(false);

  const primeiro = page.getByTestId('task-item').first();
  const alternar = primeiro.getByTestId('toggle-task-button');

  await expect(alternar).toHaveText('Concluir');
  await alternar.click();

  await expect(primeiro.getByTestId('task-item-status')).toHaveText('Concluída');
  await expect(primeiro).toHaveClass(/task-item--completed/);
  await expect(alternar).toHaveText('Desmarcar');
  await expect(page.getByTestId('completed-count')).toHaveText(String(COMPLETED + 1));
  await expect(page.getByTestId('pending-count')).toHaveText(String(PENDING - 1));

  await alternar.click();

  await expect(primeiro.getByTestId('task-item-status')).toHaveText('Pendente');
  await expect(alternar).toHaveText('Concluir');
  await expect(page.getByTestId('completed-count')).toHaveText(String(COMPLETED));
  await expect(page.getByTestId('pending-count')).toHaveText(String(PENDING));
});

test('CT-12: excluir a tarefa em edição encerra o modo de edição', async ({ page }) => {
  const primeiro = page.getByTestId('task-item').first();
  await primeiro.getByTestId('edit-task-button').click();
  await expect(page.getByTestId('save-task-button')).toBeVisible();

  await page.getByTestId('task-item').first().getByTestId('delete-task-button').click();

  await expect(page.getByTestId('add-task-button')).toBeVisible();
  await expect(page.getByTestId('task-title-input')).toHaveValue('');
  await expect(page.getByTestId('total-count')).toHaveText(String(TOTAL - 1));
});

test('CT-13: exibe o estado vazio quando todas as tarefas são removidas', async ({ page }) => {
  // Percorre as 1000 remoções pela interface, sempre no primeiro item. É o
  // caso mais custoso da aplicação e valida o comportamento com carga máxima.
  test.slow();

  await page.evaluate(async () => {
    const proximo = (): HTMLButtonElement | null =>
      document.querySelector('[data-testid="task-item"] [data-testid="delete-task-button"]');

    let botao = proximo();
    while (botao !== null) {
      botao.click();
      // Devolve o controle ao framework para que ele processe a atualização.
      await new Promise((resolve) => setTimeout(resolve, 0));
      botao = proximo();
    }
  });

  await expect(page.getByTestId('total-count')).toHaveText('0');
  await expect(page.getByTestId('completed-count')).toHaveText('0');
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByTestId('empty-state')).toHaveText('Nenhuma tarefa cadastrada.');
  await expect(page.getByTestId('task-list')).toHaveCount(0);
});
