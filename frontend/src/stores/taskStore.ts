import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createTask, deleteTask, getTasks, updateTaskStatus } from '../api/taskApi'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export type StatusFilter = 'All' | TaskStatus
export type ViewMode = 'list' | 'kanban'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])
  const selectedStatus = ref<StatusFilter>('All')
  const viewMode = ref<ViewMode>('list')
  const isLoading = ref(false)
  const error = ref('')
  let latestFetch = 0

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  async function fetchTasks(): Promise<void> {
    const fetchId = ++latestFetch
    isLoading.value = true
    error.value = ''
    try {
      const items = await getTasks(selectedStatus.value === 'All' ? undefined : selectedStatus.value)
      if (fetchId === latestFetch) {
        tasks.value = items
      }
    } catch {
      if (fetchId === latestFetch) {
        error.value = 'Unable to load tasks.'
      }
    } finally {
      if (fetchId === latestFetch) {
        isLoading.value = false
      }
    }
  }

  async function setStatusFilter(status: StatusFilter): Promise<void> {
    selectedStatus.value = status
    await fetchTasks()
  }

  async function addTask(request: CreateTaskRequest): Promise<boolean> {
    error.value = ''
    try {
      await createTask(request)
      await fetchTasks()
      return true
    } catch {
      error.value = 'Unable to create task.'
      return false
    }
  }

  async function changeStatus(id: number, status: TaskStatus): Promise<void> {
    error.value = ''
    try {
      await updateTaskStatus(id, status)
      await fetchTasks()
    } catch {
      error.value = 'Unable to update task status.'
    }
  }

  async function removeTask(id: number): Promise<void> {
    error.value = ''
    try {
      await deleteTask(id)
      await fetchTasks()
    } catch {
      error.value = 'Unable to delete task.'
    }
  }

  return { tasks, selectedStatus, viewMode, isLoading, error, fetchTasks, setStatusFilter, setViewMode, addTask, changeStatus, removeTask }
})
