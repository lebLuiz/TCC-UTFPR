import { Component, input, output } from '@angular/core';

import { DESCRIPTION_MAX_LENGTH, MESSAGES, TITLE_MAX_LENGTH } from '../../../../shared/core/task';

/**
 * A saída de envio chama-se `submitForm`, e não `submit`, para não colidir com
 * o evento nativo `submit` que borbulha do `<form>` interno até o elemento
 * hospedeiro do componente. As demais saídas têm os mesmos nomes usados nas
 * implementações em React e Vue.
 */
@Component({
  selector: 'section[app-task-form]',
  templateUrl: './task-form.html',
  host: { class: 'panel' },
})
export class TaskForm {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly completed = input.required<boolean>();
  readonly isEditing = input.required<boolean>();
  readonly errorMessage = input.required<string>();
  readonly successMessage = input.required<string>();

  readonly titleChange = output<string>();
  readonly descriptionChange = output<string>();
  readonly completedChange = output<boolean>();
  readonly submitForm = output<void>();
  readonly cancel = output<void>();

  protected readonly MESSAGES = MESSAGES;
  protected readonly TITLE_MAX_LENGTH = TITLE_MAX_LENGTH;
  protected readonly DESCRIPTION_MAX_LENGTH = DESCRIPTION_MAX_LENGTH;

  protected onTitleInput(event: Event): void {
    this.titleChange.emit((event.target as HTMLInputElement).value);
  }

  protected onDescriptionInput(event: Event): void {
    this.descriptionChange.emit((event.target as HTMLTextAreaElement).value);
  }

  protected onCompletedChange(event: Event): void {
    this.completedChange.emit((event.target as HTMLInputElement).checked);
  }
}
