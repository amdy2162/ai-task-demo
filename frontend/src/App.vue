<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore, type StatusFilter, type ViewMode } from './stores/taskStore'
import type { CreateTaskRequest, TaskStatus } from './types/task'
import TaskForm from './components/TaskForm.vue'
import TaskFilter from './components/TaskFilter.vue'
import TaskList from './components/TaskList.vue'
import TaskKanban from './components/TaskKanban.vue'
import TaskNotification from './components/TaskNotification.vue'

const store = useTaskStore()
const { tasks, selectedStatus, isLoading, error, viewMode, isRealtimeConnected } = storeToRefs(store)
const taskFormRef = ref<InstanceType<typeof TaskForm> | null>(null)

onMounted(() => {
  store.fetchTasks()
  void store.startRealtime()
})

onUnmounted(() => {
  void store.stopRealtime()
})

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
      <div class="header-eyebrow-row">
        <p class="eyebrow">WORKSPACE</p>
        <div
          class="live-badge"
          :class="{ connected: isRealtimeConnected }"
          data-test="live-sync-indicator"
        >
          <span class="live-dot"></span>
          {{ isRealtimeConnected ? 'Live Sync' : 'Offline' }}
        </div>
      </div>
      <h1>Task Management</h1>
      <p>Capture work, track progress, and collaborate in real-time across views.</p>
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
      <p v-if="isLoading && tasks.length === 0" class="state">Loading tasks...</p>
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
.header-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.header-eyebrow-row .eyebrow {
  margin: 0;
}
.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #cbd5e1;
  transition: all 0.2s ease;
}
.live-badge.connected {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
}
.live-badge.connected .live-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}
.page-header h1 { margin: 0; font-size: clamp(2rem, 5vw, 2.7rem); letter-spacing: -0.045em; color: #0f172a; }
.page-header p:not(.eyebrow) { margin: 8px 0 0; color: #64748b; }
.eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; }
.task-section { margin-top: 36px; }
.state { padding: 32px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fff; color: #64748b; text-align: center; }
@media (max-width: 560px) { .shell { margin-top: 28px; } }
</style>
