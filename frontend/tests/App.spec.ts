import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import { signalRService } from '../src/services/signalrService'
import App from '../src/App.vue'
import type { PagedResult, TaskItem } from '../src/types/task'

vi.mock('../src/api/taskApi')
vi.mock('../src/services/signalrService', () => ({
  signalRService: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
    onTaskEvent: vi.fn(),
  },
}))

import { useAuthStore } from '../src/stores/authStore'

const emptyPaged: PagedResult<TaskItem> = {
  items: [],
  totalCount: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
}

const toPaged = (items: TaskItem[]): PagedResult<TaskItem> => ({
  items,
  totalCount: items.length,
  page: 1,
  pageSize: 20,
  totalPages: Math.ceil(items.length / 20) || 1,
})

const mountApp = () => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.token = 'mocked-jwt-token'
  authStore.user = { id: 1, username: 'testuser' }
  return mount(App, { global: { plugins: [pinia] } })
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(taskApi.getTasks).mockResolvedValue(emptyPaged)
    vi.mocked(signalRService.isConnected).mockReturnValue(false)
  })

  it('loads tasks on mount and shows the empty state', async () => {
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('No tasks found.'))
  })

  it('starts real-time sync on mount and stops on unmount', async () => {
    vi.mocked(signalRService.isConnected).mockReturnValue(true)
    const wrapper = mountApp()

    expect(signalRService.start).toHaveBeenCalled()
    await vi.waitFor(() => {
      const badge = wrapper.get('[data-test="live-sync-indicator"]')
      expect(badge.text()).toContain('Live Sync')
      expect(badge.classes()).toContain('connected')
    })

    wrapper.unmount()
    expect(signalRService.stop).toHaveBeenCalled()
  })

  it('displays Offline status when real-time connection is inactive', async () => {
    vi.mocked(signalRService.isConnected).mockReturnValue(false)
    const wrapper = mountApp()

    await vi.waitFor(() => {
      const badge = wrapper.get('[data-test="live-sync-indicator"]')
      expect(badge.text()).toContain('Offline')
      expect(badge.classes()).not.toContain('connected')
    })
  })

  it('prevents a whitespace-only title', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-test="title"]').setValue('   ')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Title is required.')
    expect(taskApi.createTask).not.toHaveBeenCalled()
  })

  it('rejects a 101-character title in the browser', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-test="title"]').setValue('x'.repeat(101))
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Title must be 100 characters or fewer.')
    expect(taskApi.createTask).not.toHaveBeenCalled()
  })

  it('submits title, description, and Todo status', async () => {
    vi.mocked(taskApi.createTask).mockResolvedValue({
      id: 1,
      title: 'Demo',
      description: 'Show AI workflow',
      status: 'Todo',
      createdAt: '2026-08-10T00:00:00Z',
    })
    const wrapper = mountApp()

    await wrapper.get('[data-test="title"]').setValue('Demo')
    await wrapper.get('[data-test="description"]').setValue('Show AI workflow')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() => expect(taskApi.createTask).toHaveBeenCalledWith({
      title: 'Demo', description: 'Show AI workflow', status: 'Todo',
    }))
  })

  it('requests the selected status filter', async () => {
    const wrapper = mountApp()

    await wrapper.get('[data-test="filter"]').setValue('Doing')

    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'Doing' })))
  })

  it('shows loading and then the empty state', async () => {
    let resolve!: (items: PagedResult<TaskItem>) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Loading tasks'))

    resolve(emptyPaged)
    await vi.waitFor(() => expect(wrapper.text()).toContain('No tasks found.'))
  })

  it('renders task fields and refreshes the active filter after a status update', async () => {
    const item = {
      id: 7,
      title: 'Demo',
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }
    vi.mocked(taskApi.getTasks).mockResolvedValue(toPaged([item]))
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...item, status: 'Doing' })
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Demo'))
    expect(wrapper.text()).toContain('No description')
    expect(wrapper.get('[data-test="created-at-7"]').text()).not.toBe('')

    await wrapper.get('[data-test="filter"]').setValue('Todo')
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith(expect.objectContaining({ status: 'Todo' })))
    await wrapper.get('[data-test="task-status-7"]').setValue('Doing')

    await vi.waitFor(() => expect(taskApi.updateTaskStatus).toHaveBeenCalledWith(7, 'Doing'))
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Todo' })))
  })

  it('shows API errors from loading, creation, and status updates', async () => {
    vi.mocked(taskApi.getTasks).mockRejectedValueOnce(new Error('offline'))
    const failedLoad = mountApp()
    await vi.waitFor(() => expect(failedLoad.text()).toContain('Unable to load tasks.'))

    vi.mocked(taskApi.createTask).mockRejectedValue(new Error('offline'))
    const failedCreate = mountApp()
    await failedCreate.get('[data-test="title"]').setValue('Cannot create')
    await failedCreate.get('form').trigger('submit')
    await vi.waitFor(() => expect(failedCreate.text()).toContain('Unable to create task.'))

    const item = { id: 8, title: 'Update me', description: 'Visible', status: 'Todo' as const, createdAt: '2026-08-10T00:00:00Z' }
    vi.mocked(taskApi.getTasks).mockResolvedValue(toPaged([item]))
    vi.mocked(taskApi.updateTaskStatus).mockRejectedValue(new Error('offline'))
    const failedUpdate = mountApp()
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Update me'))
    await failedUpdate.get('[data-test="task-status-8"]').setValue('Done')
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Unable to update task status.'))
  })

  it('deletes a task and refreshes the list', async () => {
    const item = {
      id: 9,
      title: 'Task to delete',
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }
    vi.mocked(taskApi.getTasks).mockResolvedValue(toPaged([item]))
    vi.mocked(taskApi.deleteTask).mockResolvedValue()
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Task to delete'))

    await wrapper.get('[data-test="delete-task-9"]').trigger('click')

    await vi.waitFor(() => expect(taskApi.deleteTask).toHaveBeenCalledWith(9))
  })

  it('shows error when deleting a task fails', async () => {
    const item = {
      id: 10,
      title: 'Cannot delete me',
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }
    vi.mocked(taskApi.getTasks).mockResolvedValue(toPaged([item]))
    vi.mocked(taskApi.deleteTask).mockRejectedValue(new Error('offline'))
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Cannot delete me'))

    await wrapper.get('[data-test="delete-task-10"]').trigger('click')

    await vi.waitFor(() => expect(wrapper.text()).toContain('Unable to delete task.'))
  })

  it('renders pagination controls and navigates pages', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Task ${i + 1}`,
      description: '',
      status: 'Todo' as const,
      createdAt: '2026-08-10T00:00:00Z',
    }))
    
    vi.mocked(taskApi.getTasks).mockResolvedValue({
      items,
      totalCount: 25,
      page: 1,
      pageSize: 5,
      totalPages: 5,
    })

    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Task 1'))
    
    // Check pagination summary info
    expect(wrapper.get('[data-test="pagination-info"]').text()).toContain('Page 1 of 5 (Total 25 tasks)')
    
    // Previous page button should be disabled, Next should be enabled
    expect((wrapper.get('[data-test="prev-page-btn"]').element as HTMLButtonElement).disabled).toBe(true)
    expect((wrapper.get('[data-test="next-page-btn"]').element as HTMLButtonElement).disabled).toBe(false)

    // Click next page button
    await wrapper.get('[data-test="next-page-btn"]').trigger('click')

    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
  })
})
