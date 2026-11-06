# Especificação funcional da aplicação

Este documento é o **contrato** que as três implementações (React, Angular e
Vue) devem cumprir. Qualquer divergência entre uma implementação e o que está
descrito aqui invalida a comparação.

A verificação desse contrato é automatizada: `shared/test-cases.md` descreve os
casos de teste e `tests/playwright/crud.spec.ts` os executa, sem alteração,
contra as três aplicações.

---

## 1. Escopo

Aplicação de página única, sem backend, sem banco de dados, sem chamadas HTTP,
sem autenticação e sem serviços externos. Todas as operações acontecem em
memória, no navegador. O estado não é persistido: recarregar a página restaura
o dataset inicial.

## 2. Entidade

```ts
interface Task {
  id: number;           // identificador estável e único
  title: string;        // obrigatório, 1..75 caracteres (após trim)
  description: string;  // opcional, 0..500 caracteres (após trim); '' = ausente
  completed: boolean;   // status de conclusão
  createdAt: string;    // ISO 8601 UTC
  updatedAt: string;    // ISO 8601 UTC
}
```

A definição está em `shared/core/task.ts`, importado diretamente pelas três
aplicações.

## 3. Dados iniciais

A lista começa com **exatamente 1000 registros**, gerados deterministicamente
pelo algoritmo de `shared/core/dataset.ts` (PRNG mulberry32, semente
`20250101`). O mesmo arquivo é usado nas três aplicações.

Composição do dataset (verificável em `shared/dataset.json`):

| Propriedade | Valor |
| --- | --- |
| Total de registros | 1000 |
| Concluídas | 341 |
| Pendentes | 659 |
| Sem descrição | 254 |
| Maior título | 65 caracteres |
| Maior descrição | 80 caracteres |
| `id` | sequencial, de 1 a 1000 |
| `createdAt` | estritamente crescente, a partir de `2025-01-01T00:00:00.000Z` |
| `updatedAt` | sempre maior ou igual a `createdAt` |

As três importam o mesmo `shared/core/dataset.ts`, então partem dos mesmos
dados por construção. `shared/dataset.json` é o artefato canônico de
conferência: `scripts/verify-dataset.sh` confirma que o gerador o reproduz, e os
testes o usam como valor esperado.

## 4. Identificadores

Contador incremental em memória. O dataset inicial ocupa os ids 1 a 1000; a
primeira tarefa criada pelo usuário recebe o id **1001**, e assim por diante. O
contador nunca é reaproveitado, mesmo após remoções.

## 5. Telas

Uma única tela, sem navegação nem rotas, composta por quatro regiões nesta
ordem:

1. **Cabeçalho** — título da aplicação.
2. **Formulário** — criação e edição, com as mensagens de erro e sucesso.
3. **Indicadores** — total, concluídas e pendentes.
4. **Lista** — as tarefas, ou o estado vazio.

## 6. Estrutura de componentes

Idêntica nas três implementações:

```
App
├── TaskForm     formulário de criação/edição, mensagens de erro e sucesso
├── TaskStats    os três indicadores
└── TaskList     lista ou estado vazio
    └── TaskItem uma tarefa, com os três botões de ação
```

Todo o estado da aplicação vive em `App`; os filhos recebem dados por
propriedades e comunicam ações de volta por callbacks (React), eventos (Vue) ou
saídas (Angular).

## 7. Operações

| Operação | Comportamento |
| --- | --- |
| Listar | Exibe todas as tarefas na ordem do array, sem paginação, sem virtualização e sem ordenação adicional. |
| Adicionar | Valida; em caso de sucesso, **acrescenta ao final** da lista, limpa o formulário e exibe mensagem de sucesso. |
| Editar | Carrega a tarefa no formulário e entra em modo de edição. |
| Salvar | Valida; em caso de sucesso, atualiza a tarefa, atualiza `updatedAt`, sai do modo de edição, limpa o formulário e exibe mensagem de sucesso. |
| Cancelar edição | Descarta as alterações, limpa o formulário e sai do modo de edição. |
| Remover | Remove imediatamente, **sem confirmação**, e exibe mensagem de sucesso. Se a tarefa removida estiver em edição, o modo de edição é encerrado. |
| Concluir / Desmarcar | Inverte `completed`, atualiza `updatedAt`. **Não exibe mensagem**: o próprio estado visual já comunica o resultado. |

`createdAt` nunca muda depois da criação.

## 8. Validação

Avaliada na submissão do formulário, na ordem abaixo, exibindo apenas a
primeira falha encontrada:

| Ordem | Condição | Mensagem |
| --- | --- | --- |
| 1 | Título vazio após `trim()` | `O título é obrigatório.` |
| 2 | Título com mais de 75 caracteres após `trim()` | `O título deve ter no máximo 75 caracteres.` |
| 3 | Descrição com mais de 500 caracteres após `trim()` | `A descrição deve ter no máximo 500 caracteres.` |

Os campos também têm `maxlength` no HTML (75 e 500), de modo que as mensagens 2
e 3 só ocorrem por entrada programática. Títulos e descrições são gravados com
`trim()` aplicado.

Uma validação que falha **não altera a lista** e apaga qualquer mensagem de
sucesso anterior.

## 9. Mensagens

| Situação | Texto |
| --- | --- |
| Título da aplicação | `Lista de Tarefas` |
| Formulário, modo criação | `Nova tarefa` |
| Formulário, modo edição | `Editar tarefa` |
| Sucesso ao criar | `Tarefa adicionada com sucesso.` |
| Sucesso ao atualizar | `Tarefa atualizada com sucesso.` |
| Sucesso ao remover | `Tarefa removida com sucesso.` |
| Lista vazia | `Nenhuma tarefa cadastrada.` |

Rótulos: `Título`, `Descrição`, `Concluída`, `Total de tarefas`,
`Tarefas concluídas`, `Tarefas pendentes`, `Atualizada em`.

Botões: `Adicionar tarefa`, `Salvar alterações`, `Cancelar edição`, `Editar`,
`Excluir`, `Concluir`, `Desmarcar`.

Status na lista: `Concluída` / `Pendente`.

Todos os textos vêm da constante `MESSAGES` em `shared/core/task.ts`; nenhuma
implementação declara texto próprio.

## 10. Estados da interface

- **Modo criação**: aparecem `add-task-button`; `save-task-button` e
  `cancel-edit-button` não existem no DOM.
- **Modo edição**: aparecem `save-task-button` e `cancel-edit-button`;
  `add-task-button` não existe no DOM.
- **Tarefa concluída**: a linha recebe a classe `task-item--completed`, o título
  fica tachado e o status exibe `Concluída`.
- **Lista vazia**: `task-list` deixa de existir e `empty-state` aparece.

## 11. Formatação de data

`DD/MM/AAAA HH:MM`, sempre em **UTC**, montada manualmente a partir dos
componentes da data. `Intl`/`toLocaleString` não são usados porque dependem do
locale e do fuso do ambiente, o que produziria saídas diferentes entre máquinas
e quebraria tanto a equivalência visual quanto as asserções dos testes.

## 12. Atributos para automação

Idênticos nas três implementações. São o único mecanismo de seleção usado pelos
testes e pelas medições.

| Atributo | Elemento |
| --- | --- |
| `app-title` | título no cabeçalho |
| `task-form` | `<form>` |
| `task-title-input` | campo de título |
| `task-description-input` | campo de descrição |
| `task-completed-input` | caixa de seleção de conclusão |
| `add-task-button` | botão `Adicionar tarefa` |
| `save-task-button` | botão `Salvar alterações` |
| `cancel-edit-button` | botão `Cancelar edição` |
| `error-message` | mensagem de validação |
| `success-message` | mensagem de sucesso |
| `task-stats` | bloco de indicadores |
| `total-count` | valor do total |
| `completed-count` | valor de concluídas |
| `pending-count` | valor de pendentes |
| `task-list` | `<ul>` da lista |
| `task-item` | `<li>` de cada tarefa |
| `task-item-title` | título dentro do item |
| `task-item-description` | descrição dentro do item |
| `task-item-status` | status dentro do item |
| `edit-task-button` | botão `Editar` |
| `delete-task-button` | botão `Excluir` |
| `toggle-task-button` | botão `Concluir`/`Desmarcar` |
| `empty-state` | mensagem de lista vazia |

Cada `task-item` também carrega `data-task-id` com o `id` da tarefa.

## 13. Restrições de implementação

- Sem bibliotecas de UI, de componentes ou de gerenciamento de estado.
- Sem bibliotecas de terceiros que existam em apenas uma das implementações.
- Sem código de medição embutido na aplicação: toda a instrumentação é injetada
  de fora, pelo Playwright.
- Sem otimização aplicada a apenas um framework.
- Sem virtualização, paginação ou renderização preguiçosa da lista: as três
  renderizam os 1000 registros de uma vez.
- Todo o CSS vem do mesmo `shared/core/styles.css`, importado pelas três;
  nenhuma implementação usa estilo local de componente.
