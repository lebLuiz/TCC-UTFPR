import { Component, input, output } from '@angular/core';

import { TaskItem } from './task-item';
import type { Task } from '../../../../shared/core/task';
import { MESSAGES } from '../../../../shared/core/task';

@Component({
  selector: 'section[app-task-list]',
  imports: [TaskItem],
  templateUrl: './task-list.html',
  host: { class: 'panel' },
})
export class TaskList {
  readonly tasks = input.required<Task[]>();

  readonly edit = output<number>();
  readonly delete = output<number>();
  readonly toggle = output<number>();

  protected readonly MESSAGES = MESSAGES;
}
