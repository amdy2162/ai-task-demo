<script setup lang="ts">
import { computed } from 'vue'
import type { TaskItem, TaskStatus } from '../types/task'

const props = defineProps<{
  tasks: TaskItem[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'delete', id: number): void
}>()

const columns: { status: TaskStatus; label: string }[] = [
  { status: 'Todo', label: 'To Do' },
  { status: 'Doing', label: 'In Progress' },
  { status: 'Done', label: 'Completed' },
]

const groupedTasks = computed(() => {
  const groups: Record<TaskStatus, TaskItem[]> = { Todo: [], Doing: [], Done: [] }
  for (const t of props.tasks) {
    if (groups[t.status]) {
      groups[t.status].push(t)
    }
  }
  return groups
})
</script>

<template>
  <div class="kanban-board">
    <div
      v-for="col in columns"
      :key="col.status"
      class="kanban-col"
      :data-test="`column-${col.status.toLowerCase()}`"
    >
      <div class="col-header">
        <span class="col-title">{{ col.label }}</span>
        <span class="col-count">{{ groupedTasks[col.status].length }}</span>
      </div>

      <div class="col-cards">
        <div v-if="groupedTasks[col.status].length === 0" class="empty-col">
          No tasks
        </div>
        <div
          v-for="task in groupedTasks[col.status]"
          :key="task.id"
          class="card kanban-card"
        >
          <div class="card-top">
            <h4 class="card-title">{{ task.title }}</h4>
            <button
              type="button"
              class="btn-icon-delete"
              :data-test="`delete-task-${task.id}`"
              title="Delete task"
              aria-label="Delete task"
              @click="emit('delete', task.id)"
            >
              ✕
            </button>
          </div>
          <p v-if="task.description" class="card-desc">{{ task.description }}</p>
          <div class="card-footer">
            <small :data-test="`created-at-${task.id}`">{{ new Date(task.createdAt).toLocaleDateString() }}</small>
            <select
              :value="task.status"
              :data-test="`task-status-${task.id}`"
              class="mini-status-select"
              @change="emit('statusChange', task.id, ($event.target as HTMLSelectElement).value as TaskStatus)"
            >
              <option value="Todo">Todo</option>
              <option value="Doing">Doing</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  align-items: start;
}
.kanban-col {
  background: #f1f5f9;
  border-radius: 12px;
  padding: 14px;
  min-height: 280px;
}
.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 4px;
}
.col-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #334155;
}
.col-count {
  background: #e2e8f0;
  color: #475569;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
}
.col-cards {
  display: grid;
  gap: 10px;
}
.empty-col {
  padding: 24px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
  font-style: italic;
}
.kanban-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.card-title {
  margin: 0;
  font-size: 0.95rem;
  color: #1e293b;
  font-weight: 600;
  word-break: break-word;
}
.btn-icon-delete {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.btn-icon-delete:hover {
  color: #e11d48;
  background: #ffe4e6;
}
.card-desc {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.85rem;
  word-break: break-word;
}
.card-footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mini-status-select {
  padding: 4px 6px;
  font-size: 0.8rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
}
@media (max-width: 768px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }
}
</style>
