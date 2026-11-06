# Casos de teste

Os 13 casos abaixo são executados **sem alteração** contra as três aplicações,
a partir do build de produção de cada uma, servido pelo mesmo servidor
estático. A implementação está em `tests/playwright/crud.spec.ts`; os
identificadores CT-XX correspondem um a um.

Esses testes são a verificação de equivalência funcional do experimento: se
qualquer um deles falhar em qualquer framework, as implementações divergiram e
as medições de desempenho não são comparáveis. Por isso
`scripts/collect-results.sh` executa a suíte **antes** de medir.

**Pré-condição comum a todos os casos:** a página é carregada do zero e o
indicador de total exibe `1000`.

---

| ID | Caso | Passos | Resultado esperado |
| --- | --- | --- | --- |
| CT-01 | Carga do dataset inicial | Abrir a aplicação. | Título `Lista de Tarefas`; indicadores `1000`, `341` e `659`; 1000 elementos `task-item` no DOM. |
| CT-02 | Integridade do dataset | Inspecionar o primeiro e o último item. | Conferem com o primeiro e o último registro de `shared/dataset.json`, tanto no título quanto no `data-task-id` (`1` e `1000`). |
| CT-03 | Adicionar tarefa válida | Preencher título e descrição; clicar em `Adicionar tarefa`. | Mensagem `Tarefa adicionada com sucesso.`; total `1001`; pendentes `660`; a tarefa aparece **no final** da lista com `data-task-id="1001"`; o formulário é limpo. |
| CT-04 | Adicionar já concluída | Preencher título; marcar `Concluída`; clicar em `Adicionar tarefa`. | Total `1001`; concluídas `342`; o novo item exibe status `Concluída`; a caixa de seleção volta ao estado padrão. |
| CT-05 | Título vazio | Clicar em `Adicionar tarefa` com o formulário em branco. | Mensagem `O título é obrigatório.`; total permanece `1000`; nenhuma mensagem de sucesso. |
| CT-06 | Título só com espaços | Preencher o título com `"     "`; clicar em `Adicionar tarefa`. | Mensagem `O título é obrigatório.`; total permanece `1000`. |
| CT-07 | Limites dos campos | Inspecionar `maxlength`; digitar 105 caracteres no título e 560 na descrição. | `maxlength` vale `75` e `500`; os valores são truncados em 75 e 500 caracteres. |
| CT-08 | Editar tarefa | Clicar em `Editar` no primeiro item; alterar o título; clicar em `Salvar alterações`. | Em edição, aparecem `Salvar alterações` e `Cancelar edição` e o campo traz o título original, enquanto `Adicionar tarefa` some do DOM. Após salvar: mensagem `Tarefa atualizada com sucesso.`; o título muda na lista; o total permanece `1000`; o formulário volta ao modo de criação. |
| CT-09 | Cancelar edição | Clicar em `Editar`; alterar o título; clicar em `Cancelar edição`. | O formulário é limpo e volta ao modo de criação; a tarefa mantém o título original; o total permanece `1000`. |
| CT-10 | Remover tarefa | Clicar em `Excluir` no primeiro item. | Mensagem `Tarefa removida com sucesso.`; total `999`; o item de `data-task-id="2"` passa a ser o primeiro. Não há confirmação. |
| CT-11 | Concluir e desmarcar | Clicar em `Concluir` no primeiro item e depois em `Desmarcar`. | Ao concluir: status `Concluída`, classe `task-item--completed`, rótulo do botão vira `Desmarcar`, concluídas `342` e pendentes `658`. Ao desmarcar, todos os valores retornam ao estado inicial. |
| CT-12 | Excluir a tarefa em edição | Clicar em `Editar` no primeiro item; clicar em `Excluir` nesse mesmo item. | O modo de edição é encerrado, o formulário é limpo e o total passa a `999`. |
| CT-13 | Estado vazio sob carga máxima | Remover os 1000 registros pela interface, sempre no primeiro item. | Indicadores em `0`; `task-list` deixa de existir; `empty-state` exibe `Nenhuma tarefa cadastrada.`. |

---

## Cobertura

| Requisito da especificação | Casos |
| --- | --- |
| Listar tarefas | CT-01, CT-02 |
| Adicionar tarefa | CT-03, CT-04 |
| Atualizar tarefa | CT-08 |
| Remover tarefa | CT-10, CT-12 |
| Marcar / desmarcar conclusão | CT-04, CT-11 |
| Indicadores (total, concluídas, pendentes) | CT-01, CT-03, CT-04, CT-11, CT-13 |
| Validação de título | CT-05, CT-06 |
| Limites de tamanho | CT-07 |
| Mensagens de sucesso | CT-03, CT-08, CT-10 |
| Estado visual de conclusão | CT-04, CT-11 |
| Estado vazio | CT-13 |
| Cancelamento de edição | CT-09 |
| Dataset determinístico de 1000 registros | CT-01, CT-02 |
| Comportamento com 1000 registros | CT-01, CT-13 |

## Execução

```bash
docker compose run --rm tcc npm run test:e2e
```

A suíte roda os 13 casos em cada framework, totalizando 39 execuções. Os
resultados em formato JSON ficam em `results/raw/e2e-report.json`.
