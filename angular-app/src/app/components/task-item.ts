import { Component, input, output } from '@angular/core';

import type { Task } from '../../../../shared/core/task';
import { MESSAGES, formatTimestamp } from '../../../../shared/core/task';

@Component({
  // Seletor de atributo: o componente E o <li>, em vez de ser envolvido por um
  // elemento hospedeiro <app-task-item>. Isso mantem o DOM identico ao das
  // implementacoes React e Vue e produz HTML valido dentro de <ul>.
  // Ver docs/implementation-decisions.md (decisao D-14).
  selector: 'li[app-task-item]',
  templateUrl: './task-item.html',
  host: {
    class: 'task-item',
    'data-testid': 'task-item',
    '[class.task-item--completed]': 'task().completed',
    '[attr.data-task-id]': 'task().id',
  },
})
export class TaskItem {
  readonly task = input.required<Task>();

  readonly edit = output<number>();
  readonly delete = output<number>();
  readonly toggle = output<number>();

  protected readonly MESSAGES = MESSAGES;
  protected readonly formatTimestamp = formatTimestamp;
}
