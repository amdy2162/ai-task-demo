import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import { signalRService } from '../src/services/signalrService'
import { useTaskStore } from '../src/stores/taskStore'
import type { TaskItem } from '../src/types/task'

vi.mock('../src/api/taskApi')
vi.mock('../src/services/signalrService', () => ({
  signalRService: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    onTaskEvent: vi.fn(),
  },
}))

const sample: TaskItem = { id: 1, title: 'Test', description: '', status: 'Todo', createdAt: '2026-08-10T00:00:00Z' }
const pagedSample = { items: [sample], totalCount: 1, page: 1, pageSize: 20, totalPages: 1 }
const emptyPaged = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }

describe('taskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads tasks for the selected filter and sets pagination state', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue(pagedSample)
    const store = useTaskStore()
    await store.setStatusFilter('Todo')
    expect(taskApi.getTasks).toHaveBeenCalledWith({ status: 'Todo', page: 1, pageSize: 20 })
    expect(store.tasks).toEqual([sample])
    expect(store.totalCount).toBe(1)
    expect(store.page).toBe(1)
    expect(store.pageSize).toBe(20)
    expect(store.totalPages).toBe(1)
  })

  it('creates a task then reloads the active filter', async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(sample)
    vi.mocked(taskApi.getTasks).mockResolvedValue(pagedSample)
    const store = useTaskStore()
    await store.addTask({ title: 'Test' })
    expect(taskApi.createTask).toHaveBeenCalledWith({ title: 'Test' })
    expect(store.tasks).toEqual([sample])
  })

  it('updates task status optimistically in-place', async () => {
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...sample, status: 'Done' })
    const store = useTaskStore()
    store.tasks = [{ ...sample, status: 'Todo' }]
    store.selectedStatus = 'Todo'

    await store.changeStatus(1, 'Done')

    expect(taskApi.updateTaskStatus).toHaveBeenCalledWith(1, 'Done')
    // When filtered by Todo and updated to Done, it is removed from active filtered view
    expect(store.tasks).toEqual([])
  })

  it('stores a readable message when an API request fails', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await store.fetchTasks()
    expect(store.error).toBe('Unable to load tasks.')
    expect(store.isLoading).toBe(false)
  })

  it('is loading until the fetch promise settles', async () => {
    let resolve!: (items: typeof emptyPaged) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const store = useTaskStore()
    const pending = store.fetchTasks()
    expect(store.isLoading).toBe(true)
    resolve(emptyPaged)
    await pending
    expect(store.isLoading).toBe(false)
  })

  it('keeps the latest filter result when requests settle out of order', async () => {
    let resolveTodo!: (items: typeof pagedSample) => void
    let resolveDoing!: (items: typeof pagedSample) => void
    vi.mocked(taskApi.getTasks)
      .mockReturnValueOnce(new Promise(result => { resolveTodo = result }))
      .mockReturnValueOnce(new Promise(result => { resolveDoing = result }))
    const store = useTaskStore()

    const todoRequest = store.setStatusFilter('Todo')
    const doingRequest = store.setStatusFilter('Doing')
    resolveDoing({ items: [{ ...sample, status: 'Doing' }], totalCount: 1, page: 1, pageSize: 20, totalPages: 1 })
    await doingRequest
    resolveTodo(pagedSample)
    await todoRequest

    expect(store.tasks).toEqual([{ ...sample, status: 'Doing' }])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBe('')
  })

  it('reports create failures', async () => {
    vi.mocked(taskApi.createTask).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await expect(store.addTask({ title: 'Test' })).resolves.toBe(false)
    expect(store.error).toBe('Unable to create task.')
  })

  it('reports status update failures', async () => {
    vi.mocked(taskApi.updateTaskStatus).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()
    await store.changeStatus(1, 'Done')
    expect(store.error).toBe('Unable to update task status.')
  })

  it('deletes a task optimistically and removes it from store', async () => {
    vi.mocked(taskApi.deleteTask).mockResolvedValue()
    const store = useTaskStore()
    store.tasks = [sample]

    await store.removeTask(1)

    expect(taskApi.deleteTask).toHaveBeenCalledWith(1)
    expect(store.tasks).toEqual([])
  })

  it('reports delete failures', async () => {
    vi.mocked(taskApi.deleteTask).mockRejectedValue(new Error('offline'))
    const store = useTaskStore()

    await store.removeTask(1)

    expect(store.error).toBe('Unable to delete task.')
  })

  it('switches view mode between list and kanban', () => {
    const store = useTaskStore()
    expect(store.viewMode).toBe('list')
    store.setViewMode('kanban')
    expect(store.viewMode).toBe('kanban')
    store.setViewMode('list')
    expect(store.viewMode).toBe('list')
  })

  it('starts realtime connection and handles task events', async () => {
    vi.mocked(signalRService.isConnected).mockReturnValue(true)
    vi.mocked(taskApi.getTasks).mockResolvedValue(pagedSample)
    const store = useTaskStore()
    await store.startRealtime()

    expect(signalRService.onTaskEvent).toHaveBeenCalled()
    expect(signalRService.start).toHaveBeenCalled()
    expect(store.isRealtimeConnected).toBe(true)

    const callback = vi.mocked(signalRService.onTaskEvent).mock.calls[0][0]
    callback()
    expect(taskApi.getTasks).toHaveBeenCalled()
  })

  it('stops realtime connection', async () => {
    const store = useTaskStore()
    store.isRealtimeConnected = true
    await store.stopRealtime()

    expect(signalRService.stop).toHaveBeenCalled()
    expect(store.isRealtimeConnected).toBe(false)
  })
})

