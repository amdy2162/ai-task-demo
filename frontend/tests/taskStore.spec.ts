import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import { useTaskStore } from '../src/stores/taskStore'
import type { TaskItem } from '../src/types/task'

vi.mock('../src/api/taskApi')
const sample = { id: 1, title: 'Test', description: '', status: 'Todo' as const, createdAt: '2026-08-10T00:00:00Z' }

describe('taskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('loads tasks for the selected filter', async () => {
    vi.mocked(taskApi.getTasks).mockResolvedValue([sample])
    const store = useTaskStore()
    await store.setStatusFilter('Todo')
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
    expect(store.tasks).toEqual([sample])
  })

  it('creates a task then reloads the active filter', async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue(sample)
    vi.mocked(taskApi.getTasks).mockResolvedValue([sample])
    const store = useTaskStore()
    await store.addTask({ title: 'Test' })
    expect(taskApi.createTask).toHaveBeenCalledWith({ title: 'Test' })
    expect(store.tasks).toEqual([sample])
  })

  it('refreshes the active filter after a status update', async () => {
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...sample, status: 'Done' })
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
    const store = useTaskStore()
    store.tasks = [sample]
    store.selectedStatus = 'Todo'
    await store.changeStatus(1, 'Done')
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
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
    let resolve!: (items: Array<typeof sample>) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const store = useTaskStore()
    const pending = store.fetchTasks()
    expect(store.isLoading).toBe(true)
    resolve([])
    await pending
    expect(store.isLoading).toBe(false)
  })

  it('keeps the latest filter result when requests settle out of order', async () => {
    let resolveTodo!: (items: TaskItem[]) => void
    let resolveDoing!: (items: TaskItem[]) => void
    vi.mocked(taskApi.getTasks)
      .mockReturnValueOnce(new Promise(result => { resolveTodo = result }))
      .mockReturnValueOnce(new Promise(result => { resolveDoing = result }))
    const store = useTaskStore()

    const todoRequest = store.setStatusFilter('Todo')
    const doingRequest = store.setStatusFilter('Doing')
    resolveDoing([{ ...sample, status: 'Doing' }])
    await doingRequest
    resolveTodo([sample])
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

  it('deletes a task then reloads the active filter', async () => {
    vi.mocked(taskApi.deleteTask).mockResolvedValue()
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
    const store = useTaskStore()
    store.tasks = [sample]
    store.selectedStatus = 'Todo'

    await store.removeTask(1)

    expect(taskApi.deleteTask).toHaveBeenCalledWith(1)
    expect(taskApi.getTasks).toHaveBeenCalledWith('Todo')
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
})
