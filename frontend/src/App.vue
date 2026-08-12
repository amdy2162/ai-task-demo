<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore, type StatusFilter } from './stores/taskStore'
import type { TaskStatus } from './types/task'

const store = useTaskStore()
const { tasks, selectedStatus, isLoading, error } = storeToRefs(store)
const title = ref('')
const description = ref('')
const newStatus = ref<TaskStatus>('Todo')
const validationError = ref('')
const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

onMounted(() => store.fetchTasks())

async function submit(): Promise<void> {
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

  const created = await store.addTask({
    title: trimmedTitle,
    description: description.value.trim(),
    status: newStatus.value,
  })

  if (created) {
    title.value = ''
    description.value = ''
    newStatus.value = 'Todo'
  }
}

function filterChanged(event: Event): void {
  void store.setStatusFilter((event.target as HTMLSelectElement).value as StatusFilter)
}

function statusChanged(id: number, event: Event): void {
  void store.changeStatus(id, (event.target as HTMLSelectElement).value as TaskStatus)
}

function deleteTask(id: number): void {
  void store.removeTask(id)
}
</script>

<template>
  <main class="shell">
    <header class="page-header">
      <p class="eyebrow">WORKSPACE</p>
      <h1>Task management</h1>
      <p>Capture work, follow progress, and keep the next step visible.</p>
    </header>

    <form class="card form" @submit.prevent="submit">
      <h2>Add a task</h2>
      <label>
        Title
        <input v-model="title" data-test="title" maxlength="101" />
      </label>
      <label>
        Description <span class="optional">Optional</span>
        <textarea v-model="description" data-test="description" rows="3" />
      </label>
      <label>
        Initial status
        <select v-model="newStatus">
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
      <p v-if="validationError" class="error" role="alert">{{ validationError }}</p>
      <button type="submit">Add task</button>
    </form>

    <section class="task-section" aria-labelledby="tasks-heading">
      <div class="toolbar">
        <div>
          <h2 id="tasks-heading">Tasks</h2>
          <p>Use the status selector to keep each task current.</p>
        </div>
        <label class="filter">
          Filter
          <select :value="selectedStatus" data-test="filter" @change="filterChanged">
            <option value="All">All</option>
            <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
          </select>
        </label>
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="isLoading" class="state">Loading tasks...</p>
      <p v-else-if="tasks.length === 0" class="state">No tasks found.</p>
      <ul v-else class="tasks">
        <li v-for="task in tasks" :key="task.id" class="card task">
          <div>
            <h3>{{ task.title }}</h3>
            <p>{{ task.description || 'No description' }}</p>
            <small :data-test="`created-at-${task.id}`">Created {{ new Date(task.createdAt).toLocaleString() }}</small>
          </div>
          <div class="actions">
            <label class="status-control">
              Status
              <select :value="task.status" :data-test="`task-status-${task.id}`" @change="statusChanged(task.id, $event)">
                <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <button
              type="button"
              class="btn-delete"
              :data-test="`delete-task-${task.id}`"
              aria-label="Delete task"
              @click="deleteTask(task.id)"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(body) { margin: 0; background: #f6f7fb; color: #1e293b; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
:global(button), :global(input), :global(textarea), :global(select) { font: inherit; }
.shell { width: min(860px, calc(100% - 32px)); margin: 48px auto 72px; }
.page-header { margin-bottom: 28px; }
.page-header h1, h2, h3 { margin: 0; color: #172033; }
.page-header h1 { font-size: clamp(2rem, 5vw, 2.7rem); letter-spacing: -0.045em; }
.page-header p:not(.eyebrow), .toolbar p { margin: 8px 0 0; color: #64748b; }
.eyebrow { margin: 0 0 8px; color: #3559c7; font-size: .75rem; font-weight: 800; letter-spacing: .12em; }
.card { border: 1px solid #dce1ec; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgb(15 23 42 / 4%); }
.form { display: grid; gap: 14px; padding: 22px; }
.form h2 { font-size: 1.15rem; }
label { display: grid; gap: 6px; font-size: .9rem; font-weight: 650; }
.optional { color: #64748b; font-weight: 400; }
input, textarea, select { width: 100%; padding: 9px 10px; border: 1px solid #bfc8d9; border-radius: 7px; background: #fff; color: inherit; }
textarea { resize: vertical; }
button { justify-self: start; padding: 10px 16px; border: 1px solid #284bb4; border-radius: 7px; background: #3157c8; color: #fff; cursor: pointer; font-weight: 700; }
button:hover { background: #284bb4; }
.task-section { margin-top: 32px; }
.toolbar { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
.toolbar h2 { font-size: 1.35rem; }
.filter { min-width: 140px; }
.state { padding: 24px; border: 1px dashed #cbd5e1; border-radius: 10px; color: #64748b; text-align: center; }
.tasks { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.task { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 18px 20px; }
.task h3 { font-size: 1.05rem; }
.task p { margin: 7px 0; color: #475569; }
.task small { color: #64748b; }
.status-control { width: 118px; flex: 0 0 auto; }
.actions { display: flex; align-items: flex-end; gap: 12px; }
.btn-delete { padding: 9px 12px; border: 1px solid #fecdd3; border-radius: 7px; background: #fff1f2; color: #be123c; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn-delete:hover { background: #ffe4e6; border-color: #fda4af; }
.error { color: #b42318; font-weight: 600; }
@media (max-width: 560px) {
  .shell { margin-top: 28px; }
  .toolbar, .task { align-items: stretch; flex-direction: column; }
  .filter, .status-control { width: 100%; }
  .actions { flex-direction: column; width: 100%; }
  .btn-delete { width: 100%; }
}
</style>
