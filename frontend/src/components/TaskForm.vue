<script setup lang="ts">
import { ref } from 'vue'
import type { CreateTaskRequest, TaskStatus } from '../types/task'

const emit = defineEmits<{
  (e: 'create', request: CreateTaskRequest): void
}>()

const title = ref('')
const description = ref('')
const newStatus = ref<TaskStatus>('Todo')
const validationError = ref('')
const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

function submit(): void {
  validationError.value = ''
  const trimmedTitle = title.value.trim()

  if (!trimmedTitle) {
    validationError.value = 'Title is required.'
    return
  }

  if (trimmedTitle.length > 100) {
    validationError.value = 'Title must be 100 characters or fewer.'
    return
  }

  emit('create', {
    title: trimmedTitle,
    description: description.value.trim(),
    status: newStatus.value,
  })
}

function reset(): void {
  title.value = ''
  description.value = ''
  newStatus.value = 'Todo'
  validationError.value = ''
}

defineExpose({ reset })
</script>

<template>
  <form class="card form-card" @submit.prevent="submit">
    <div class="form-header">
      <h2>Add a task</h2>
      <p>Quickly organize your thoughts into actionable items.</p>
    </div>

    <label class="form-label">
      <span>Title <span class="required">*</span></span>
      <input
        v-model="title"
        data-test="title"
        maxlength="101"
        placeholder="e.g. Implement user login flow"
      />
    </label>

    <label class="form-label">
      <span>Description <span class="optional">Optional</span></span>
      <textarea
        v-model="description"
        data-test="description"
        rows="3"
        placeholder="Add details, acceptance criteria, or reference links..."
      />
    </label>

    <label class="form-label">
      <span>Initial status</span>
      <select v-model="newStatus">
        <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
      </select>
    </label>

    <p v-if="validationError" class="error" role="alert">{{ validationError }}</p>

    <button type="submit" class="btn-submit">Add task</button>
  </form>
</template>

<style scoped>
.card {
  border: 1px solid #dce1ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.form-card {
  display: grid;
  gap: 16px;
  padding: 24px;
}
.form-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #172033;
}
.form-header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.88rem;
}
.form-label {
  display: grid;
  gap: 6px;
  font-size: 0.88rem;
  font-weight: 650;
  color: #334155;
}
.required { color: #e11d48; }
.optional { color: #94a3b8; font-weight: 400; font-size: 0.8rem; }
input, textarea, select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}
textarea { resize: vertical; }
.btn-submit {
  justify-self: start;
  padding: 10px 20px;
  border: 1px solid #2563eb;
  border-radius: 8px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.92rem;
  transition: all 0.15s ease;
}
.btn-submit:hover {
  background: #2563eb;
}
.error {
  color: #b91c1c;
  font-weight: 600;
  margin: 0;
  font-size: 0.88rem;
}
</style>
