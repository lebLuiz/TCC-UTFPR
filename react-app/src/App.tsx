import { useState } from 'react';

import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { TaskStats } from './components/TaskStats';
import { FIRST_GENERATED_ID, generateInitialTasks } from '../../shared/core/dataset';
import type { Task, TaskDraft } from '../../shared/core/task';
import {
  MESSAGES,
  applyDraft,
  createTask,
  nowIso,
  toggleTask,
  validateDraft,
} from '../../shared/core/task';

/**
 * A divisão de responsabilidades é idêntica nas três implementações:
 * App -> TaskForm, TaskStats, TaskList -> TaskItem.
 */
export function App() {
  const [tasks, setTasks] = useState<Task[]>(generateInitialTasks);
  const [nextId, setNextId] = useState<number>(FIRST_GENERATED_ID);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const totalCount = tasks.length;
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = totalCount - completedCount;

  function resetForm(): void {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCompleted(false);
  }

  function handleSubmit(): void {
    const draft: TaskDraft = { title, description, completed };
    const validationError = validateDraft(draft);

    if (validationError !== null) {
      setErrorMessage(validationError);
      setSuccessMessage('');
      return;
    }

    const now = nowIso();

    if (editingId === null) {
      setTasks((current) => [...current, createTask(nextId, draft, now)]);
      setNextId((current) => current + 1);
      setSuccessMessage(MESSAGES.successCreated);
    } else {
      setTasks((current) =>
        current.map((task) => (task.id === editingId ? applyDraft(task, draft, now) : task)),
      );
      setSuccessMessage(MESSAGES.successUpdated);
    }

    setErrorMessage('');
    resetForm();
  }

  function handleEdit(id: number): void {
    const target = tasks.find((task) => task.id === id);
    if (target === undefined) {
      return;
    }

    setEditingId(target.id);
    setTitle(target.title);
    setDescription(target.description);
    setCompleted(target.completed);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function handleCancelEdit(): void {
    resetForm();
    setErrorMessage('');
    setSuccessMessage('');
  }

  /** Não há confirmação de exclusão, conforme a especificação. */
  function handleDelete(id: number): void {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (editingId === id) {
      resetForm();
    }

    setErrorMessage('');
    setSuccessMessage(MESSAGES.successDeleted);
  }

  function handleToggle(id: number): void {
    const now = nowIso();
    setTasks((current) => current.map((task) => (task.id === id ? toggleTask(task, now) : task)));
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title" data-testid="app-title">
          {MESSAGES.appTitle}
        </h1>
      </header>

      <TaskForm
        title={title}
        description={description}
        completed={completed}
        isEditing={editingId !== null}
        errorMessage={errorMessage}
        successMessage={successMessage}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCompletedChange={setCompleted}
        onSubmit={handleSubmit}
        onCancel={handleCancelEdit}
      />

      <TaskStats total={totalCount} completed={completedCount} pending={pendingCount} />

      <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
    </div>
  );
}
