<script setup lang="ts">
import { MESSAGES } from '../../../shared/core/task';

defineProps<{
  total: number;
  completed: number;
  pending: number;
}>();
</script>

<template>
  <section class="stats" data-testid="task-stats">
    <div class="stat">
      <span class="stat-label">{{ MESSAGES.statsTotal }}</span>
      <span class="stat-value" data-testid="total-count">{{ total }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">{{ MESSAGES.statsCompleted }}</span>
      <span class="stat-value" data-testid="completed-count">{{ completed }}</span>
    </div>
    <div class="stat">
      <span class="stat-label">{{ MESSAGES.statsPending }}</span>
      <span class="stat-value" data-testid="pending-count">{{ pending }}</span>
    </div>
  </section>
</template>
