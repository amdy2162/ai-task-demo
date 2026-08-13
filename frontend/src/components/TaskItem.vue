<script setup lang="ts">
import { ref } from 'vue'
import type { TaskItem, TaskStatus } from '../types/task'

const props = defineProps<{
  task: TaskItem
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'edit', id: number, title: string, description: string): void
  (e: 'delete', id: number): void
}>()

const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']
const isEditing = ref(false)
const editTitle = ref(props.task.title)
const editDesc = ref(props.task.description)
const validationError = ref('')

function onStatusChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('statusChange', props.task.id, target.value as TaskStatus)
}

function startEdit(): void {
  editTitle.value = props.task.title
  editDesc.value = props.task.description
  validationError.value = ''
  isEditing.value = true
}

function cancelEdit(): void {
  isEditing.value = false
}

function saveEdit(): void {
  const titleTrimmed = editTitle.value.trim()
  if (!titleTrimmed) {
    validationError.value = 'Title is required.'
    return
  }
  if (titleTrimmed.length > 100) {
    validationError.value = 'Title is too long.'
    return
  }
  emit('edit', props.task.id, titleTrimmed, editDesc.value.trim())
  isEditing.value = false
}
</script>

<template>
  <li class="card task-card" :class="[`status-${task.status.toLowerCase()}`, { editing: isEditing }]">
    <div class="task-main">
      <div class="task-header">
        <span class="badge" :class="`badge-${task.status.toLowerCase()}`">{{ task.status }}</span>
        <small :data-test="`created-at-${task.id}`">Created {{ new Date(task.createdAt).toLocaleString() }}</small>
      </div>
      
      <div v-if="isEditing" class="edit-fields">
        <input
          v-model="editTitle"
          class="edit-input-title"
          data-test="edit-title"
          placeholder="Task title"
          maxlength="101"
        />
        <textarea
          v-model="editDesc"
          class="edit-input-desc"
          data-test="edit-description"
          placeholder="Task description"
          rows="2"
        />
        <p v-if="validationError" class="edit-error" role="alert">{{ validationError }}</p>
      </div>
      <div v-else>
        <h3 class="task-title" data-test="task-title">{{ task.title }}</h3>
        <p class="task-desc" data-test="task-description">{{ task.description || 'No description' }}</p>
      </div>
    </div>
    
    <div class="actions">
      <template v-if="isEditing">
        <button
          type="button"
          class="btn-save"
          data-test="save-edit"
          @click="saveEdit"
        >
          Save
        </button>
        <button
          type="button"
          class="btn-cancel"
          data-test="cancel-edit"
          @click="cancelEdit"
        >
          Cancel
        </button>
      </template>
      <template v-else>
        <label class="status-control">
          Status
          <select :value="task.status" :data-test="`task-status-${task.id}`" @change="onStatusChange">
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
        <button
          type="button"
          class="btn-edit"
          :data-test="`edit-task-btn-${task.id}`"
          @click="startEdit"
        >
          Edit
        </button>
        <button
          type="button"
          class="btn-delete"
          :data-test="`delete-task-${task.id}`"
          aria-label="Delete task"
          @click="emit('delete', task.id)"
        >
          Delete
        </button>
      </template>
    </div>
  </li>
</template>

<style scoped>
.task-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px 20px;
  border: 1px solid #dce1ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}
.task-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
}
.task-main {
  flex: 1;
  min-width: 0;
}
.task-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-todo { background: #f1f5f9; color: #475569; }
.badge-doing { background: #fef3c7; color: #d97706; }
.badge-done { background: #dcfce7; color: #16a34a; }
.task-title {
  margin: 0;
  font-size: 1.05rem;
  color: #172033;
  word-break: break-word;
}
.task-desc {
  margin: 6px 0 0;
  color: #475569;
  font-size: 0.92rem;
  word-break: break-word;
}
small { color: #64748b; font-size: 0.8rem; }
.actions {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-shrink: 0;
}
.status-control {
  width: 118px;
  display: grid;
  gap: 4px;
  font-size: 0.85rem;
  font-weight: 650;
}
select {
  padding: 8px 10px;
  border: 1px solid #bfc8d9;
  border-radius: 7px;
  background: #fff;
  font: inherit;
  color: inherit;
}
.btn-delete {
  padding: 8px 12px;
  border: 1px solid #fecdd3;
  border-radius: 7px;
  background: #fff1f2;
  color: #be123c;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}
.btn-delete:hover {
  background: #ffe4e6;
  border-color: #fda4af;
}
.btn-edit {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}
.btn-edit:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.btn-save {
  padding: 8px 12px;
  border: 1px solid #3b82f6;
  border-radius: 7px;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}
.btn-save:hover {
  background: #2563eb;
}
.btn-cancel {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}
.btn-cancel:hover {
  background: #f8fafc;
}
.edit-fields {
  display: grid;
  gap: 8px;
  margin-top: 4px;
}
.edit-input-title {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1.05rem;
  font-weight: 600;
}
.edit-input-desc {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.92rem;
  resize: vertical;
}
.edit-error {
  color: #b91c1c;
  font-weight: 600;
  font-size: 0.82rem;
  margin: 0;
}
@media (max-width: 560px) {
  .task-card { flex-direction: column; align-items: stretch; }
  .actions { width: 100%; flex-direction: column; }
  .status-control, .btn-delete, .btn-edit, .btn-save, .btn-cancel { width: 100%; }
}
</style>
