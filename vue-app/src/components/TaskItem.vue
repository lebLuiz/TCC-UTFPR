<script setup lang="ts">
import type { Task } from '../../../shared/core/task';
import { MESSAGES, formatTimestamp } from '../../../shared/core/task';

const props = defineProps<{
  task: Task;
}>();

const emit = defineEmits<{
  (event: 'edit', id: number): void;
  (event: 'delete', id: number): void;
  (event: 'toggle', id: number): void;
}>();
</script>

<template>
  <li
    class="task-item"
    :class="{ 'task-item--completed': props.task.completed }"
    :data-task-id="props.task.id"
    data-testid="task-item"
  >
    <div class="task-content">
      <div class="task-title" data-testid="task-item-title">{{ props.task.title }}</div>

      <div
        v-if="props.task.description !== ''"
        class="task-description"
        data-testid="task-item-description"
      >
        {{ props.task.description }}
      </div>

      <div class="task-meta">
        <span
          class="task-status"
          :class="{ 'task-status--completed': props.task.completed }"
          data-testid="task-item-status"
        >
          {{ props.task.completed ? MESSAGES.statusCompleted : MESSAGES.statusPending }}
        </span>
        <span class="task-meta-text">
          {{ MESSAGES.columnUpdatedAt }}: {{ formatTimestamp(props.task.updatedAt) }}
        </span>
      </div>
    </div>

    <div class="task-actions">
      <button
        class="button button--small"
        data-testid="toggle-task-button"
        type="button"
        @click="emit('toggle', props.task.id)"
      >
        {{ props.task.completed ? MESSAGES.buttonUncomplete : MESSAGES.buttonComplete }}
      </button>
      <button
        class="button button--small"
        data-testid="edit-task-button"
        type="button"
        @click="emit('edit', props.task.id)"
      >
        {{ MESSAGES.buttonEdit }}
      </button>
      <button
        class="button button--small button--danger"
        data-testid="delete-task-button"
        type="button"
        @click="emit('delete', props.task.id)"
      >
        {{ MESSAGES.buttonDelete }}
      </button>
    </div>
  </li>
</template>
