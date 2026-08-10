import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as taskApi from '../src/api/taskApi'
import App from '../src/App.vue'

vi.mock('../src/api/taskApi')

const mountApp = () => mount(App, { global: { plugins: [createPinia()] } })

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    vi.mocked(taskApi.getTasks).mockResolvedValue([])
  })

  it('loads tasks on mount and shows the empty state', async () => {
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('No tasks found.'))
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

    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith('Doing'))
  })

  it('shows loading and then the empty state', async () => {
    let resolve!: (items: []) => void
    vi.mocked(taskApi.getTasks).mockReturnValue(new Promise(result => { resolve = result }))
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Loading tasks'))

    resolve([])
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
    vi.mocked(taskApi.getTasks).mockResolvedValue([item])
    vi.mocked(taskApi.updateTaskStatus).mockResolvedValue({ ...item, status: 'Doing' })
    const wrapper = mountApp()

    await vi.waitFor(() => expect(wrapper.text()).toContain('Demo'))
    expect(wrapper.text()).toContain('No description')
    expect(wrapper.get('[data-test="created-at-7"]').text()).not.toBe('')

    await wrapper.get('[data-test="filter"]').setValue('Todo')
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenCalledWith('Todo'))
    await wrapper.get('[data-test="task-status-7"]').setValue('Doing')

    await vi.waitFor(() => expect(taskApi.updateTaskStatus).toHaveBeenCalledWith(7, 'Doing'))
    await vi.waitFor(() => expect(taskApi.getTasks).toHaveBeenLastCalledWith('Todo'))
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
    vi.mocked(taskApi.getTasks).mockResolvedValue([item])
    vi.mocked(taskApi.updateTaskStatus).mockRejectedValue(new Error('offline'))
    const failedUpdate = mountApp()
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Update me'))
    await failedUpdate.get('[data-test="task-status-8"]').setValue('Done')
    await vi.waitFor(() => expect(failedUpdate.text()).toContain('Unable to update task status.'))
  })
})
