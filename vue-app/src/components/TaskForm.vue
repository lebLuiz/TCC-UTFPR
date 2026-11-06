<script setup lang="ts">
import { DESCRIPTION_MAX_LENGTH, MESSAGES, TITLE_MAX_LENGTH } from '../../../shared/core/task';

defineProps<{
  title: string;
  description: string;
  completed: boolean;
  isEditing: boolean;
  errorMessage: string;
  successMessage: string;
}>();

const emit = defineEmits<{
  (event: 'titleChange', value: string): void;
  (event: 'descriptionChange', value: string): void;
  (event: 'completedChange', value: boolean): void;
  (event: 'submit'): void;
  (event: 'cancel'): void;
}>();

function onTitleInput(event: Event): void {
  emit('titleChange', (event.target as HTMLInputElement).value);
}

function onDescriptionInput(event: Event): void {
  emit('descriptionChange', (event.target as HTMLTextAreaElement).value);
}

function onCompletedChange(event: Event): void {
  emit('completedChange', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <section class="panel">
    <h2 class="panel-title">
      {{ isEditing ? MESSAGES.formLegendEdit : MESSAGES.formLegendCreate }}
    </h2>

    <p
      v-if="errorMessage !== ''"
      class="message message--error"
      data-testid="error-message"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <p
      v-if="successMessage !== ''"
      class="message message--success"
      data-testid="success-message"
      role="status"
    >
      {{ successMessage }}
    </p>

    <form class="task-form" data-testid="task-form" novalidate @submit.prevent="emit('submit')">
      <div class="form-field">
        <label class="form-label" for="task-title">{{ MESSAGES.labelTitle }}</label>
        <input
          id="task-title"
          class="form-input"
          data-testid="task-title-input"
          type="text"
          :maxlength="TITLE_MAX_LENGTH"
          :placeholder="MESSAGES.placeholderTitle"
          :value="title"
          @input="onTitleInput"
        />
        <p class="form-hint">{{ title.length }}/{{ TITLE_MAX_LENGTH }}</p>
      </div>

      <div class="form-field">
        <label class="form-label" for="task-description">{{ MESSAGES.labelDescription }}</label>
        <textarea
          id="task-description"
          class="form-textarea"
          data-testid="task-description-input"
          :maxlength="DESCRIPTION_MAX_LENGTH"
          :placeholder="MESSAGES.placeholderDescription"
          :value="description"
          @input="onDescriptionInput"
        ></textarea>
        <p class="form-hint">{{ description.length }}/{{ DESCRIPTION_MAX_LENGTH }}</p>
      </div>

      <div class="form-checkbox-field">
        <input
          id="task-completed"
          class="form-checkbox"
          data-testid="task-completed-input"
          type="checkbox"
          :checked="completed"
          @change="onCompletedChange"
        />
        <label class="form-label" for="task-completed">{{ MESSAGES.labelCompleted }}</label>
      </div>

      <div class="form-actions">
        <button
          v-if="isEditing"
          class="button button--primary"
          data-testid="save-task-button"
          type="submit"
        >
          {{ MESSAGES.buttonSave }}
        </button>
        <button v-else class="button button--primary" data-testid="add-task-button" type="submit">
          {{ MESSAGES.buttonAdd }}
        </button>

        <button
          v-if="isEditing"
          class="button"
          data-testid="cancel-edit-button"
          type="button"
          @click="emit('cancel')"
        >
          {{ MESSAGES.buttonCancel }}
        </button>
      </div>
    </form>
  </section>
</template>
