<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TaskItem, TaskStatus } from '../types/task'

const props = defineProps<{
  tasks: TaskItem[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'edit', id: number, title: string, description: string): void
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

const editingTaskId = ref<number | null>(null)
const editTitle = ref('')
const editDesc = ref('')
const validationError = ref('')

function startEdit(task: TaskItem): void {
  editingTaskId.value = task.id
  editTitle.value = task.title
  editDesc.value = task.description
  validationError.value = ''
}

function cancelEdit(): void {
  editingTaskId.value = null
}

function saveEdit(task: TaskItem): void {
  const titleTrimmed = editTitle.value.trim()
  if (!titleTrimmed) {
    validationError.value = 'Title is required.'
    return
  }
  if (titleTrimmed.length > 100) {
    validationError.value = 'Title is too long.'
    return
  }
  emit('edit', task.id, titleTrimmed, editDesc.value.trim())
  editingTaskId.value = null
}
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

      <TransitionGroup name="kanban-anim" tag="div" class="col-cards">
        <div v-if="groupedTasks[col.status].length === 0" key="empty" class="empty-col">
          No tasks
        </div>
        <div
          v-for="task in groupedTasks[col.status]"
          :key="task.id"
          class="card kanban-card"
          :class="{ editing: editingTaskId === task.id }"
        >
          <div v-if="editingTaskId === task.id" class="edit-fields">
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
            <div class="edit-actions">
              <button type="button" class="btn-save" data-test="save-edit" @click="saveEdit(task)">Save</button>
              <button type="button" class="btn-cancel" data-test="cancel-edit" @click="cancelEdit">Cancel</button>
            </div>
          </div>
          <div v-else>
            <div class="card-top">
              <h4 class="card-title" data-test="task-title">{{ task.title }}</h4>
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
            <p class="card-desc" data-test="task-description">{{ task.description || 'No description' }}</p>
            <div class="card-footer">
              <small :data-test="`created-at-${task.id}`">{{ new Date(task.createdAt).toLocaleDateString() }}</small>
              <div class="card-footer-actions">
                <button
                  type="button"
                  class="btn-edit-kanban"
                  :data-test="`edit-task-btn-${task.id}`"
                  @click="startEdit(task)"
                >
                  Edit
                </button>
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
      </TransitionGroup>
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
.card-footer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-edit-kanban {
  padding: 4px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s ease;
}
.btn-edit-kanban:hover {
  background: #e2e8f0;
}
.edit-fields {
  display: grid;
  gap: 8px;
}
.edit-input-title {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
}
.edit-input-desc {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.82rem;
  resize: vertical;
}
.edit-error {
  color: #b91c1c;
  font-weight: 600;
  font-size: 0.78rem;
  margin: 0;
}
.edit-actions {
  display: flex;
  gap: 8px;
}
.btn-save {
  padding: 6px 12px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  background: #3b82f6;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s ease;
}
.btn-save:hover {
  background: #2563eb;
}
.btn-cancel {
  padding: 6px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.1s ease;
}
.btn-cancel:hover {
  background: #f8fafc;
}
@media (max-width: 768px) {
  .kanban-board {
    grid-template-columns: 1fr;
  }
}

/* Kanban 卡片淡入、淡出與平滑位移動畫 */
.kanban-anim-enter-active,
.kanban-anim-leave-active {
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

.kanban-anim-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.kanban-anim-leave-to {
  opacity: 0;
  transform: scale(0.93);
}

.kanban-anim-move {
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
