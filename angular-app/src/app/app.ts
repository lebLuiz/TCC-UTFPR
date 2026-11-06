import { Component, computed, signal } from '@angular/core';

import { TaskForm } from './components/task-form';
import { TaskList } from './components/task-list';
import { TaskStats } from './components/task-stats';
import { FIRST_GENERATED_ID, generateInitialTasks } from '../../../shared/core/dataset';
import type { Task, TaskDraft } from '../../../shared/core/task';
import {
  MESSAGES,
  applyDraft,
  createTask,
  nowIso,
  toggleTask,
  validateDraft,
} from '../../../shared/core/task';

/**
 * A divisão de responsabilidades é idêntica nas três implementações:
 * App -> TaskForm, TaskStats, TaskList -> TaskItem.
 */
@Component({
  selector: 'app-root',
  imports: [TaskForm, TaskStats, TaskList],
  templateUrl: './app.html',
})
export class App {
  protected readonly MESSAGES = MESSAGES;

  protected readonly tasks = signal<Task[]>(generateInitialTasks());
  protected readonly nextId = signal<number>(FIRST_GENERATED_ID);
  protected readonly editingId = signal<number | null>(null);
  protected readonly draftTitle = signal<string>('');
  protected readonly draftDescription = signal<string>('');
  protected readonly draftCompleted = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly successMessage = signal<string>('');

  protected readonly totalCount = computed<number>(() => this.tasks().length);
  protected readonly completedCount = computed<number>(
    () => this.tasks().filter((task) => task.completed).length,
  );
  protected readonly pendingCount = computed<number>(
    () => this.totalCount() - this.completedCount(),
  );

  protected readonly isEditing = computed<boolean>(() => this.editingId() !== null);

  private resetForm(): void {
    this.editingId.set(null);
    this.draftTitle.set('');
    this.draftDescription.set('');
    this.draftCompleted.set(false);
  }

  protected handleSubmit(): void {
    const draft: TaskDraft = {
      title: this.draftTitle(),
      description: this.draftDescription(),
      completed: this.draftCompleted(),
    };
    const validationError = validateDraft(draft);

    if (validationError !== null) {
      this.errorMessage.set(validationError);
      this.successMessage.set('');
      return;
    }

    const now = nowIso();
    const editingId = this.editingId();

    if (editingId === null) {
      this.tasks.update((current) => [...current, createTask(this.nextId(), draft, now)]);
      this.nextId.update((current) => current + 1);
      this.successMessage.set(MESSAGES.successCreated);
    } else {
      this.tasks.update((current) =>
        current.map((task) => (task.id === editingId ? applyDraft(task, draft, now) : task)),
      );
      this.successMessage.set(MESSAGES.successUpdated);
    }

    this.errorMessage.set('');
    this.resetForm();
  }

  protected handleEdit(id: number): void {
    const target = this.tasks().find((task) => task.id === id);
    if (target === undefined) {
      return;
    }

    this.editingId.set(target.id);
    this.draftTitle.set(target.title);
    this.draftDescription.set(target.description);
    this.draftCompleted.set(target.completed);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  protected handleCancelEdit(): void {
    this.resetForm();
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  /** Não há confirmação de exclusão, conforme a especificação. */
  protected handleDelete(id: number): void {
    this.tasks.update((current) => current.filter((task) => task.id !== id));
    if (this.editingId() === id) {
      this.resetForm();
    }

    this.errorMessage.set('');
    this.successMessage.set(MESSAGES.successDeleted);
  }

  protected handleToggle(id: number): void {
    const now = nowIso();
    this.tasks.update((current) =>
      current.map((task) => (task.id === id ? toggleTask(task, now) : task)),
    );
  }
}
