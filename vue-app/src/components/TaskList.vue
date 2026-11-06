<script setup lang="ts">
import TaskItem from './TaskItem.vue';
import type { Task } from '../../../shared/core/task';
import { MESSAGES } from '../../../shared/core/task';

defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits<{
  (event: 'edit', id: number): void;
  (event: 'delete', id: number): void;
  (event: 'toggle', id: number): void;
}>();
</script>

<template>
  <section class="panel">
    <p v-if="tasks.length === 0" class="empty-state" data-testid="empty-state">
      {{ MESSAGES.emptyState }}
    </p>

    <ul v-else class="task-list" data-testid="task-list">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @edit="emit('edit', $event)"
        @delete="emit('delete', $event)"
        @toggle="emit('toggle', $event)"
      />
    </ul>
  </section>
</template>
