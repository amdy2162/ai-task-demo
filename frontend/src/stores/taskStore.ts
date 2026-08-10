import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createTask, getTasks, updateTaskStatus } from '../api/taskApi'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export type StatusFilter = 'All' | TaskStatus

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])
  const selectedStatus = ref<StatusFilter>('All')
  const isLoading = ref(false)
  const error = ref('')
  let latestFetch = 0

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

  return { tasks, selectedStatus, isLoading, error, fetchTasks, setStatusFilter, addTask, changeStatus }
})
