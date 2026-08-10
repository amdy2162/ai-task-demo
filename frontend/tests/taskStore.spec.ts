import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import { useTaskStore } from '../src/stores/taskStore'

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
})
