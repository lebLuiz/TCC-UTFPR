import { Component, input } from '@angular/core';

import { MESSAGES } from '../../../../shared/core/task';

@Component({
  selector: 'section[app-task-stats]',
  templateUrl: './task-stats.html',
  host: { class: 'stats', 'data-testid': 'task-stats' },
})
export class TaskStats {
  readonly total = input.required<number>();
  readonly completed = input.required<number>();
  readonly pending = input.required<number>();

  protected readonly MESSAGES = MESSAGES;
}
