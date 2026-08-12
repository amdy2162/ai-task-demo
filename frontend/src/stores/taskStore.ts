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

  async function fetchTasks(silent = false): Promise<void> {
    const fetchId = ++latestFetch
    if (!silent && tasks.value.length === 0) {
      isLoading.value = true
    }
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
          totalCount.value = (data as TaskItem[]).length
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
      const created = await createTask(request)
      if (created && !tasks.value.some(t => t.id === created.id)) {
        // 如果當前篩選是 All 或與新建立的任務狀態一致，立即插入清單最上方
        if (selectedStatus.value === 'All' || selectedStatus.value === created.status) {
          tasks.value = [created, ...tasks.value]
        }
        totalCount.value++
      }
      return true
    } catch {
      error.value = 'Unable to create task.'
      return false
    }
  }

  async function changeStatus(id: number, status: TaskStatus): Promise<void> {
    error.value = ''
    const target = tasks.value.find(t => t.id === id)
    const originalStatus = target?.status

    // 樂觀更新：立即在原地修改狀態
    if (target) {
      target.status = status
      if (selectedStatus.value !== 'All' && selectedStatus.value !== status) {
        tasks.value = tasks.value.filter(t => t.id !== id)
      }
    }

    try {
      await updateTaskStatus(id, status)
    } catch {
      // 失敗時復原
      if (target && originalStatus) {
        target.status = originalStatus
      }
      error.value = 'Unable to update task status.'
    }
  }

  async function removeTask(id: number): Promise<void> {
    error.value = ''
    const previousTasks = [...tasks.value]
    const previousTotal = totalCount.value

    // 樂觀更新：0ms 立即從畫面移除
    tasks.value = tasks.value.filter(t => t.id !== id)
    totalCount.value = Math.max(0, totalCount.value - 1)

    try {
      await deleteTask(id)
    } catch {
      // 失敗時復原原本的陣列
      tasks.value = previousTasks
      totalCount.value = previousTotal
      error.value = 'Unable to delete task.'
    }
  }

  async function startRealtime(): Promise<void> {
    signalRService.onTaskEvent(() => {
      // SignalR 收到通知時進行靜默背景同步，不觸發全螢幕 loading
      void fetchTasks(true)
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
