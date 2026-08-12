<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore, type StatusFilter, type ViewMode } from './stores/taskStore'
import type { CreateTaskRequest, TaskStatus } from './types/task'
import TaskForm from './components/TaskForm.vue'
import TaskFilter from './components/TaskFilter.vue'
import TaskList from './components/TaskList.vue'
import TaskKanban from './components/TaskKanban.vue'
import TaskNotification from './components/TaskNotification.vue'

const store = useTaskStore()
const { tasks, selectedStatus, isLoading, error, viewMode } = storeToRefs(store)
const taskFormRef = ref<InstanceType<typeof TaskForm> | null>(null)

onMounted(() => store.fetchTasks())

async function handleCreate(request: CreateTaskRequest): Promise<void> {
  const created = await store.addTask(request)
  if (created && taskFormRef.value) {
    taskFormRef.value.reset()
  }
}

function handleFilterChange(status: StatusFilter): void {
  void store.setStatusFilter(status)
}

function handleViewModeChange(mode: ViewMode): void {
  store.setViewMode(mode)
}

function handleStatusChange(id: number, status: TaskStatus): void {
  void store.changeStatus(id, status)
}

function handleDeleteTask(id: number): void {
  void store.removeTask(id)
}
</script>

<template>
  <main class="shell">
    <header class="page-header">
      <p class="eyebrow">WORKSPACE</p>
      <h1>Task Management</h1>
      <p>Capture work, track progress, and organize seamlessly across views.</p>
    </header>

    <TaskForm ref="taskFormRef" @create="handleCreate" />

    <section class="task-section" aria-labelledby="tasks-heading">
      <TaskFilter
        :selected-status="selectedStatus"
        :view-mode="viewMode"
        @filter-change="handleFilterChange"
        @view-mode-change="handleViewModeChange"
      />

      <TaskNotification :error="error" />
      <p v-if="isLoading" class="state">Loading tasks...</p>
      <p v-else-if="tasks.length === 0" class="state">No tasks found.</p>
      <template v-else>
        <TaskList
          v-if="viewMode === 'list'"
          :tasks="tasks"
          @status-change="handleStatusChange"
          @delete="handleDeleteTask"
        />
        <TaskKanban
          v-else
          :tasks="tasks"
          @status-change="handleStatusChange"
          @delete="handleDeleteTask"
        />
      </template>
    </section>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #f8fafc; color: #1e293b; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
:global(button), :global(input), :global(textarea), :global(select) { font: inherit; }
.shell { width: min(920px, calc(100% - 32px)); margin: 48px auto 72px; }
.page-header { margin-bottom: 28px; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 5vw, 2.7rem); letter-spacing: -0.045em; color: #0f172a; }
.page-header p:not(.eyebrow) { margin: 8px 0 0; color: #64748b; }
.eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; }
.task-section { margin-top: 36px; }
.state { padding: 32px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fff; color: #64748b; text-align: center; }
@media (max-width: 560px) { .shell { margin-top: 28px; } }
</style>
