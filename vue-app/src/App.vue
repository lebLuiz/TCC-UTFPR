<script setup lang="ts">
import { computed, ref } from 'vue';

import TaskForm from './components/TaskForm.vue';
import TaskList from './components/TaskList.vue';
import TaskStats from './components/TaskStats.vue';
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

/*
 * A divisão de responsabilidades é idêntica nas três implementações:
 * App -> TaskForm, TaskStats, TaskList -> TaskItem.
 */

const tasks = ref<Task[]>(generateInitialTasks());
const nextId = ref<number>(FIRST_GENERATED_ID);
const editingId = ref<number | null>(null);
const title = ref<string>('');
const description = ref<string>('');
const completed = ref<boolean>(false);
const errorMessage = ref<string>('');
const successMessage = ref<string>('');

const totalCount = computed<number>(() => tasks.value.length);
const completedCount = computed<number>(() => tasks.value.filter((task) => task.completed).length);
const pendingCount = computed<number>(() => totalCount.value - completedCount.value);

function resetForm(): void {
  editingId.value = null;
  title.value = '';
  description.value = '';
  completed.value = false;
}

function handleSubmit(): void {
  const draft: TaskDraft = {
    title: title.value,
    description: description.value,
    completed: completed.value,
  };
  const validationError = validateDraft(draft);

  if (validationError !== null) {
    errorMessage.value = validationError;
    successMessage.value = '';
    return;
  }

  const now = nowIso();

  if (editingId.value === null) {
    tasks.value = [...tasks.value, createTask(nextId.value, draft, now)];
    nextId.value += 1;
    successMessage.value = MESSAGES.successCreated;
  } else {
    const target = editingId.value;
    tasks.value = tasks.value.map((task) =>
      task.id === target ? applyDraft(task, draft, now) : task,
    );
    successMessage.value = MESSAGES.successUpdated;
  }

  errorMessage.value = '';
  resetForm();
}

function handleEdit(id: number): void {
  const target = tasks.value.find((task) => task.id === id);
  if (target === undefined) {
    return;
  }

  editingId.value = target.id;
  title.value = target.title;
  description.value = target.description;
  completed.value = target.completed;
  errorMessage.value = '';
  successMessage.value = '';
}

function handleCancelEdit(): void {
  resetForm();
  errorMessage.value = '';
  successMessage.value = '';
}

/** Não há confirmação de exclusão, conforme a especificação. */
function handleDelete(id: number): void {
  tasks.value = tasks.value.filter((task) => task.id !== id);
  if (editingId.value === id) {
    resetForm();
  }

  errorMessage.value = '';
  successMessage.value = MESSAGES.successDeleted;
}

function handleToggle(id: number): void {
  const now = nowIso();
  tasks.value = tasks.value.map((task) => (task.id === id ? toggleTask(task, now) : task));
}
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title" data-testid="app-title">{{ MESSAGES.appTitle }}</h1>
    </header>

    <TaskForm
      :title="title"
      :description="description"
      :completed="completed"
      :is-editing="editingId !== null"
      :error-message="errorMessage"
      :success-message="successMessage"
      @title-change="title = $event"
      @description-change="description = $event"
      @completed-change="completed = $event"
      @submit="handleSubmit"
      @cancel="handleCancelEdit"
    />

    <TaskStats :total="totalCount" :completed="completedCount" :pending="pendingCount" />

    <TaskList :tasks="tasks" @edit="handleEdit" @delete="handleDelete" @toggle="handleToggle" />
  </div>
</template>
