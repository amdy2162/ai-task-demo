import MockAdapter from 'axios-mock-adapter'
import { afterEach, describe, expect, it } from 'vitest'
import { apiClient, createTask, getTasks, updateTaskStatus } from '../src/api/taskApi'

const mock = new MockAdapter(apiClient)

afterEach(() => mock.reset())

describe('taskApi', () => {
  it('requests all tasks without a status parameter', async () => {
    const emptyPaged = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }
    mock.onGet('/tasks').reply(200, emptyPaged)
    await expect(getTasks()).resolves.toEqual(emptyPaged)
    expect(mock.history.get[0].params).toBeUndefined()
  })

  it('requests tasks with an optional status filter and pagination params', async () => {
    const pagedResult = { items: [], totalCount: 0, page: 1, pageSize: 20, totalPages: 0 }
    mock.onGet('/tasks', { params: { status: 'Doing', page: 1, pageSize: 20 } }).reply(200, pagedResult)
    await expect(getTasks({ status: 'Doing', page: 1, pageSize: 20 })).resolves.toEqual(pagedResult)
  })

  it('posts the create payload', async () => {
    const item = { id: 1, title: 'Plan', description: '', status: 'Todo', createdAt: '2026-08-10T00:00:00Z' }
    mock.onPost('/tasks', { title: 'Plan' }).reply(201, item)
    await expect(createTask({ title: 'Plan' })).resolves.toEqual(item)
  })

  it('patches only the status', async () => {
    const item = { id: 1, title: 'Plan', description: '', status: 'Done', createdAt: '2026-08-10T00:00:00Z' }
    mock.onPatch('/tasks/1/status', { status: 'Done' }).reply(200, item)
    await expect(updateTaskStatus(1, 'Done')).resolves.toEqual(item)
  })
})
