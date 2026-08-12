<script setup lang="ts">
import type { TaskItem, TaskStatus } from '../types/task'

const props = defineProps<{
  task: TaskItem
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'delete', id: number): void
}>()

const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

function onStatusChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('statusChange', props.task.id, target.value as TaskStatus)
}
</script>

<template>
  <li class="card task-card" :class="`status-${task.status.toLowerCase()}`">
    <div class="task-main">
      <div class="task-header">
        <span class="badge" :class="`badge-${task.status.toLowerCase()}`">{{ task.status }}</span>
        <small :data-test="`created-at-${task.id}`">Created {{ new Date(task.createdAt).toLocaleString() }}</small>
      </div>
      <h3 class="task-title">{{ task.title }}</h3>
      <p class="task-desc">{{ task.description || 'No description' }}</p>
    </div>
    <div class="actions">
      <label class="status-control">
        Status
        <select :value="task.status" :data-test="`task-status-${task.id}`" @change="onStatusChange">
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
      <button
        type="button"
        class="btn-delete"
        :data-test="`delete-task-${task.id}`"
        aria-label="Delete task"
        @click="emit('delete', task.id)"
      >
        Delete
      </button>
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
@media (max-width: 560px) {
  .task-card { flex-direction: column; align-items: stretch; }
  .actions { width: 100%; flex-direction: column; }
  .status-control, .btn-delete { width: 100%; }
}
</style>
