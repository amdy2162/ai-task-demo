<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore, type StatusFilter, type ViewMode } from './stores/taskStore'
import { useAuthStore } from './stores/authStore'
import type { CreateTaskRequest, TaskStatus } from './types/task'
import TaskForm from './components/TaskForm.vue'
import TaskFilter from './components/TaskFilter.vue'
import TaskList from './components/TaskList.vue'
import TaskKanban from './components/TaskKanban.vue'
import TaskNotification from './components/TaskNotification.vue'
import AuthModal from './components/AuthModal.vue'

const store = useTaskStore()
const {
  tasks,
  selectedStatus,
  isLoading,
  error,
  viewMode,
  isRealtimeConnected,
  searchQuery,
  sortBy,
  sortOrder,
  page,
  totalPages,
  totalCount,
} = storeToRefs(store)

const authStore = useAuthStore()
const { user, isAuthenticated } = storeToRefs(authStore)

const taskFormRef = ref<InstanceType<typeof TaskForm> | null>(null)
const isAuthModalOpen = ref(false)

onMounted(() => {
  if (isAuthenticated.value) {
    store.fetchTasks()
    void store.startRealtime()
  }
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

function handleEditTask(id: number, title: string, description: string): void {
  void store.editTask(id, title, description)
}

function handleSearchChange(search: string): void {
  void store.setSearchQuery(search)
}

function handleSortChange(sortBy: string, sortOrder: 'asc' | 'desc'): void {
  void store.setSort(sortBy, sortOrder)
}

function handlePageChange(pageNum: number): void {
  void store.setPage(pageNum)
}

async function handleLoginSuccess(): Promise<void> {
  await store.fetchTasks()
  await store.stopRealtime()
  await store.startRealtime()
}

async function handleLogout(): Promise<void> {
  authStore.logout()
  await store.stopRealtime()
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
        <div class="user-auth-section">
          <template v-if="isAuthenticated">
            <span class="user-welcome" data-test="welcome-message">👤 Welcome, {{ user?.username }}!</span>
            <button @click="handleLogout" class="btn-secondary btn-logout" data-test="logout-btn">Logout</button>
          </template>
          <template v-else>
            <button @click="isAuthModalOpen = true" class="btn-secondary btn-login" data-test="login-btn">Login / Register</button>
          </template>
        </div>
      </div>
      <h1>Task Management</h1>
      <p>Capture work, track progress, and collaborate in real-time across views.</p>
    </header>

    <TaskForm v-if="authStore.canEdit" ref="taskFormRef" @create="handleCreate" />

    <section class="task-section" aria-labelledby="tasks-heading">
      <div v-if="!isAuthenticated" class="auth-prompt-card">
        <div class="auth-prompt-content">
          <div class="prompt-icon-container">
            <span class="prompt-icon">👤</span>
          </div>
          <h2>Join your task workspace</h2>
          <p>Sign in to capture tasks, update progress in real-time, and customize your boards. Your data is privately isolated for you.</p>
          <button @click="isAuthModalOpen = true" class="btn-prompt-login" data-test="prompt-login-btn">Get Started</button>
        </div>
      </div>
      <template v-else>
        <TaskFilter
          :selected-status="selectedStatus"
          :view-mode="viewMode"
          :search-query="searchQuery"
          :sort-by="sortBy"
          :sort-order="sortOrder"
          @filter-change="handleFilterChange"
          @view-mode-change="handleViewModeChange"
          @search-change="handleSearchChange"
          @sort-change="handleSortChange"
        />

        <TaskNotification :error="error" />
        <p v-if="isLoading && tasks.length === 0" class="state">Loading tasks...</p>
        <p v-else-if="tasks.length === 0" class="state">No tasks found.</p>
        <template v-else>
          <TaskList
            v-if="viewMode === 'list'"
            :tasks="tasks"
            @status-change="handleStatusChange"
            @edit="handleEditTask"
            @delete="handleDeleteTask"
          />
          <TaskKanban
            v-else
            :tasks="tasks"
            @status-change="handleStatusChange"
            @edit="handleEditTask"
            @delete="handleDeleteTask"
          />

          <div v-if="viewMode === 'list'" class="pagination-bar" data-test="pagination-bar">
            <button
              type="button"
              class="btn-pagination-nav"
              data-test="prev-page-btn"
              :disabled="page === 1"
              @click="handlePageChange(page - 1)"
            >
              ◀ Previous
            </button>
            <span class="pagination-info" data-test="pagination-info">
              Page {{ page }} of {{ totalPages }} (Total {{ totalCount }} tasks)
            </span>
            <button
              type="button"
              class="btn-pagination-nav"
              data-test="next-page-btn"
              :disabled="page >= totalPages"
              @click="handlePageChange(page + 1)"
            >
              Next ▶
            </button>
          </div>
        </template>
      </template>
    </section>

    <AuthModal :is-open="isAuthModalOpen" @close="isAuthModalOpen = false" @success="handleLoginSuccess" />
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
  width: 100%;
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
.user-auth-section {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.88rem;
}
.user-welcome {
  color: #475569;
  font-weight: 500;
}
.btn-secondary {
  padding: 4px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #fff;
  color: #475569;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}
.btn-secondary:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
  color: #1e293b;
}
.page-header h1 { margin: 0; font-size: clamp(2rem, 5vw, 2.7rem); letter-spacing: -0.045em; color: #0f172a; }
.page-header p:not(.eyebrow) { margin: 8px 0 0; color: #64748b; }
.eyebrow { margin: 0 0 8px; color: #2563eb; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.12em; }
.task-section { margin-top: 36px; }
.state { padding: 32px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #fff; color: #64748b; text-align: center; }

.auth-prompt-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  padding: 48px 32px;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  max-width: 500px;
  margin: 32px auto;
}
.prompt-icon-container {
  width: 64px;
  height: 64px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.prompt-icon {
  font-size: 1.75rem;
}
.auth-prompt-content h2 {
  font-size: 1.5rem;
  margin: 0 0 12px;
  color: #0f172a;
}
.auth-prompt-content p {
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 24px;
}
.btn-prompt-login {
  padding: 10px 24px;
  background: #3b82f6;
  color: #fff;
  border: 1px solid #2563eb;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-prompt-login:hover {
  background: #2563eb;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 12px 16px;
  border: 1px solid #dce1ec;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.02);
}
.btn-pagination-nav {
  padding: 8px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-pagination-nav:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
  color: #1e293b;
}
.btn-pagination-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pagination-info {
  font-size: 0.88rem;
  color: #64748b;
  font-weight: 600;
}

@media (max-width: 560px) {
  .shell { margin-top: 28px; }
  .pagination-bar { flex-direction: column; gap: 12px; text-align: center; }
  .btn-pagination-nav { width: 100%; }
}
</style>
