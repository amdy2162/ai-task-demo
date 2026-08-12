# Frontend Architecture & UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 Vue 3 前端重構為模組化元件架構（拆解表單、列表、單項卡片、篩選列、看板視圖、通知列），並引入看板（Kanban Board）多視圖模式與現代化設計體驗，同時提供完整元件測試覆蓋。

**Architecture:** 將 `App.vue` 單一龐大元件重構為單一職責元件（`TaskForm`, `TaskFilter`, `TaskItem`, `TaskList`, `TaskKanban`, `TaskNotification`），在 `taskStore.ts` 中擴充視圖切換狀態（`viewMode`: `'list' | 'kanban'`），嚴格維持所有既有 `data-test` 屬性與 API 合約相容性，並加入獨立元件的單元測試與流暢的現代化 UI/UX。

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, Pinia, Vite, Vitest, @vue/test-utils, Modern CSS.

---

### Task 1: Store Enhancement - ViewMode State & Tests

**Files:**
- Modify: `frontend/src/stores/taskStore.ts`
- Test: `frontend/tests/taskStore.spec.ts`

- [ ] **Step 1: Write failing unit test for viewMode in taskStore.spec.ts**

In `frontend/tests/taskStore.spec.ts`, add:
```typescript
  it('switches view mode between list and kanban', () => {
    const store = useTaskStore()
    expect(store.viewMode).toBe('list')
    store.setViewMode('kanban')
    expect(store.viewMode).toBe('kanban')
    store.setViewMode('list')
    expect(store.viewMode).toBe('list')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- tests/taskStore.spec.ts`
Expected: FAIL because `viewMode` or `setViewMode` is not defined on `store`.

- [ ] **Step 3: Implement viewMode in taskStore.ts**

In `frontend/src/stores/taskStore.ts`:
```typescript
export type ViewMode = 'list' | 'kanban'
```
Add state & action in `useTaskStore`:
```typescript
  const viewMode = ref<ViewMode>('list')

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }
```
Expose `viewMode` and `setViewMode` in return object:
```typescript
  return {
    tasks,
    selectedStatus,
    isLoading,
    error,
    viewMode,
    fetchTasks,
    setStatusFilter,
    setViewMode,
    addTask,
    changeStatus,
    removeTask,
  }
```

- [ ] **Step 4: Run store tests to verify they pass**

Run: `cd frontend && npm test -- tests/taskStore.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/taskStore.ts frontend/tests/taskStore.spec.ts
git commit -m "feat(frontend): add viewMode state and action in taskStore"
```

---

### Task 2: Modular Components Part 1 - TaskItem, TaskFilter, TaskNotification & Tests

**Files:**
- Create: `frontend/src/components/TaskNotification.vue`
- Create: `frontend/src/components/TaskItem.vue`
- Create: `frontend/src/components/TaskFilter.vue`
- Create: `frontend/tests/TaskItem.spec.ts`
- Create: `frontend/tests/TaskFilter.spec.ts`

- [ ] **Step 1: Write failing component tests for TaskItem and TaskFilter**

Create `frontend/tests/TaskItem.spec.ts`:
```typescript
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskItem from '../src/components/TaskItem.vue'
import type { TaskItem as TaskItemType } from '../src/types/task'

describe('TaskItem', () => {
  const sample: TaskItemType = {
    id: 1,
    title: 'Test Title',
    description: 'Test Description',
    status: 'Todo',
    createdAt: '2026-08-10T00:00:00Z',
  }

  it('renders task fields correctly', () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.text()).toContain('Test Description')
    expect(wrapper.get('[data-test="created-at-1"]').text()).not.toBe('')
  })

  it('emits statusChange when selector changes', async () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    await wrapper.get('[data-test="task-status-1"]').setValue('Doing')
    expect(wrapper.emitted('statusChange')?.[0]).toEqual([1, 'Doing'])
  })

  it('emits delete when delete button is clicked', async () => {
    const wrapper = mount(TaskItem, { props: { task: sample } })
    await wrapper.get('[data-test="delete-task-1"]').trigger('click')
    expect(wrapper.emitted('delete')?.[0]).toEqual([1])
  })
})
```

Create `frontend/tests/TaskFilter.spec.ts`:
```typescript
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskFilter from '../src/components/TaskFilter.vue'

describe('TaskFilter', () => {
  it('renders active filter and emits filterChange', async () => {
    const wrapper = mount(TaskFilter, {
      props: { selectedStatus: 'All', viewMode: 'list' },
    })
    await wrapper.get('[data-test="filter"]').setValue('Todo')
    expect(wrapper.emitted('filterChange')?.[0]).toEqual(['Todo'])
  })

  it('emits viewModeChange when view toggle is clicked', async () => {
    const wrapper = mount(TaskFilter, {
      props: { selectedStatus: 'All', viewMode: 'list' },
    })
    await wrapper.get('[data-test="view-kanban"]').trigger('click')
    expect(wrapper.emitted('viewModeChange')?.[0]).toEqual(['kanban'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- tests/TaskItem.spec.ts tests/TaskFilter.spec.ts`
Expected: FAIL because components do not exist yet.

- [ ] **Step 3: Implement TaskNotification.vue, TaskItem.vue, and TaskFilter.vue**

Create `frontend/src/components/TaskNotification.vue`:
```html
<script setup lang="ts">
defineProps<{
  error?: string
}>()
</script>

<template>
  <div v-if="error" class="notification-error" role="alert" data-test="global-error">
    <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
    </svg>
    <span>{{ error }}</span>
  </div>
</template>

<style scoped>
.notification-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
```

Create `frontend/src/components/TaskItem.vue`:
```html
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
```

Create `frontend/src/components/TaskFilter.vue`:
```html
<script setup lang="ts">
import type { StatusFilter, ViewMode } from '../stores/taskStore'
import type { TaskStatus } from '../types/task'

defineProps<{
  selectedStatus: StatusFilter
  viewMode: ViewMode
}>()

const emit = defineEmits<{
  (e: 'filterChange', status: StatusFilter): void
  (e: 'viewModeChange', mode: ViewMode): void
}>()

const statuses: TaskStatus[] = ['Todo', 'Doing', 'Done']

function onFilterChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('filterChange', target.value as StatusFilter)
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-info">
      <h2 id="tasks-heading">Tasks</h2>
      <p>Use the status selector to keep each task current.</p>
    </div>
    <div class="toolbar-controls">
      <div class="view-switch" role="group" aria-label="View switch">
        <button
          type="button"
          class="btn-view"
          :class="{ active: viewMode === 'list' }"
          data-test="view-list"
          @click="emit('viewModeChange', 'list')"
        >
          List
        </button>
        <button
          type="button"
          class="btn-view"
          :class="{ active: viewMode === 'kanban' }"
          data-test="view-kanban"
          @click="emit('viewModeChange', 'kanban')"
        >
          Kanban
        </button>
      </div>
      <label class="filter">
        Filter
        <select :value="selectedStatus" data-test="filter" @change="onFilterChange">
          <option value="All">All</option>
          <option v-for="status in statuses" :key="status" :value="status">{{ status }}</option>
        </select>
      </label>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.toolbar-info h2 {
  margin: 0;
  font-size: 1.35rem;
  color: #172033;
}
.toolbar-info p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}
.toolbar-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
.view-switch {
  display: flex;
  background: #e2e8f0;
  border-radius: 8px;
  padding: 2px;
}
.btn-view {
  padding: 7px 14px;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-view.active {
  background: #ffffff;
  color: #1e293b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.filter {
  min-width: 140px;
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
@media (max-width: 560px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .toolbar-controls { flex-direction: column; width: 100%; }
  .filter { width: 100%; }
  .view-switch { width: 100%; }
  .btn-view { flex: 1; text-align: center; }
}
</style>
```

- [ ] **Step 4: Run TaskItem and TaskFilter tests to verify they pass**

Run: `cd frontend && npm test -- tests/TaskItem.spec.ts tests/TaskFilter.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TaskNotification.vue frontend/src/components/TaskItem.vue frontend/src/components/TaskFilter.vue frontend/tests/TaskItem.spec.ts frontend/tests/TaskFilter.spec.ts
git commit -m "feat(frontend): create TaskItem, TaskFilter, and TaskNotification components with tests"
```

---

### Task 3: Modular Components Part 2 - TaskForm, TaskList, TaskKanban & Tests

**Files:**
- Create: `frontend/src/components/TaskForm.vue`
- Create: `frontend/src/components/TaskList.vue`
- Create: `frontend/src/components/TaskKanban.vue`
- Create: `frontend/tests/TaskForm.spec.ts`
- Create: `frontend/tests/TaskKanban.spec.ts`

- [ ] **Step 1: Write failing component tests for TaskForm and TaskKanban**

Create `frontend/tests/TaskForm.spec.ts`:
```typescript
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskForm from '../src/components/TaskForm.vue'

describe('TaskForm', () => {
  it('validates required title and emits submit', async () => {
    const wrapper = mount(TaskForm)

    await wrapper.get('[data-test="title"]').setValue('   ')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Title is required.')
    expect(wrapper.emitted('create')).toBeUndefined()

    await wrapper.get('[data-test="title"]').setValue('Valid Title')
    await wrapper.get('[data-test="description"]').setValue('Valid Desc')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('create')?.[0]).toEqual([{
      title: 'Valid Title',
      description: 'Valid Desc',
      status: 'Todo',
    }])
  })
})
```

Create `frontend/tests/TaskKanban.spec.ts`:
```typescript
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TaskKanban from '../src/components/TaskKanban.vue'
import type { TaskItem } from '../src/types/task'

describe('TaskKanban', () => {
  const tasks: TaskItem[] = [
    { id: 1, title: 'Task 1', description: '', status: 'Todo', createdAt: '2026-08-10T00:00:00Z' },
    { id: 2, title: 'Task 2', description: '', status: 'Doing', createdAt: '2026-08-10T00:00:00Z' },
    { id: 3, title: 'Task 3', description: '', status: 'Done', createdAt: '2026-08-10T00:00:00Z' },
  ]

  it('groups tasks into Todo, Doing, Done columns', () => {
    const wrapper = mount(TaskKanban, { props: { tasks } })
    expect(wrapper.get('[data-test="column-todo"]').text()).toContain('Task 1')
    expect(wrapper.get('[data-test="column-doing"]').text()).toContain('Task 2')
    expect(wrapper.get('[data-test="column-done"]').text()).toContain('Task 3')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- tests/TaskForm.spec.ts tests/TaskKanban.spec.ts`
Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement TaskForm.vue, TaskList.vue, and TaskKanban.vue**

Create `frontend/src/components/TaskForm.vue`:
```html
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
```

Create `frontend/src/components/TaskList.vue`:
```html
<script setup lang="ts">
import TaskItem from './TaskItem.vue'
import type { TaskItem as TaskItemType, TaskStatus } from '../types/task'

defineProps<{
  tasks: TaskItemType[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', id: number, status: TaskStatus): void
  (e: 'delete', id: number): void
}>()
</script>

<template>
  <ul class="tasks">
    <TaskItem
      v-for="task in tasks"
      :key="task.id"
      :task="task"
      @status-change="(id, status) => emit('statusChange', id, status)"
      @delete="id => emit('delete', id)"
    />
  </ul>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
```

Create `frontend/src/components/TaskKanban.vue`:
```html
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

const columns: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'Todo', label: 'To Do', color: '#64748b' },
  { status: 'Doing', label: 'In Progress', color: '#d97706' },
  { status: 'Done', label: 'Completed', color: '#16a34a' },
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
```

- [ ] **Step 4: Run TaskForm and TaskKanban tests to verify they pass**

Run: `cd frontend && npm test -- tests/TaskForm.spec.ts tests/TaskKanban.spec.ts`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TaskForm.vue frontend/src/components/TaskList.vue frontend/src/components/TaskKanban.vue frontend/tests/TaskForm.spec.ts frontend/tests/TaskKanban.spec.ts
git commit -m "feat(frontend): create TaskForm, TaskList, and TaskKanban components with tests"
```

---

### Task 4: Main View Integration in App.vue, Modern Polish & Full Suite Verification

**Files:**
- Modify: `frontend/src/App.vue`
- Modify: `frontend/tests/App.spec.ts`

- [ ] **Step 1: Update App.vue to compose the modular components**

In `frontend/src/App.vue`, replace inline implementation with clean composition of `TaskForm`, `TaskFilter`, `TaskList`, `TaskKanban`, and `TaskNotification`, maintaining full `data-test` testability.

```html
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
```

- [ ] **Step 2: Run all frontend tests and build check**

Run: `cd frontend && npm test ; npm run build`
Expected: ALL PASS and build succeeds cleanly.

- [ ] **Step 3: Run backend tests to ensure end-to-end alignment**

Run: `dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj`
Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.vue frontend/tests/App.spec.ts docs/superpowers/plans/2026-08-12-frontend-architecture-and-ux.md
git commit -m "refactor(frontend): decompose App.vue into modular components and add kanban view"
```
