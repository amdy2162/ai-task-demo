import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createTask, deleteTask, getTasks, updateTaskStatus } from '../api/taskApi'
import { signalRService } from '../services/signalrService'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export type StatusFilter = 'All' | TaskStatus
export type ViewMode = 'list' | 'kanban'

export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])
  const selectedStatus = ref<StatusFilter>('All')
  const viewMode = ref<ViewMode>('list')
  const isLoading = ref(false)
  const error = ref('')
  const isRealtimeConnected = ref(false)
  const totalCount = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(1)
  let latestFetch = 0

  function setViewMode(mode: ViewMode): void {
    viewMode.value = mode
  }

  async function fetchTasks(): Promise<void> {
    const fetchId = ++latestFetch
    isLoading.value = true
    error.value = ''
    try {
      const data = await getTasks({
        status: selectedStatus.value === 'All' ? undefined : selectedStatus.value,
        page: page.value,
        pageSize: pageSize.value,
      })
      if (fetchId === latestFetch) {
        if (data && Array.isArray(data.items)) {
          tasks.value = data.items
          totalCount.value = data.totalCount ?? data.items.length
          page.value = data.page ?? 1
          pageSize.value = data.pageSize ?? 20
          totalPages.value = data.totalPages ?? 1
        } else if (Array.isArray(data)) {
          tasks.value = data
          totalCount.value = data.length
        }
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

  async function startRealtime(): Promise<void> {
    signalRService.onTaskEvent(() => {
      void fetchTasks()
    })
    await signalRService.start()
    isRealtimeConnected.value = signalRService.isConnected()
  }

  async function stopRealtime(): Promise<void> {
    await signalRService.stop()
    isRealtimeConnected.value = false
  }

  return {
    tasks,
    selectedStatus,
    viewMode,
    isLoading,
    error,
    isRealtimeConnected,
    totalCount,
    page,
    pageSize,
    totalPages,
    fetchTasks,
    setStatusFilter,
    setViewMode,
    addTask,
    changeStatus,
    removeTask,
    startRealtime,
    stopRealtime,
  }
})
