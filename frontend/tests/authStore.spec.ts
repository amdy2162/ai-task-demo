import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../src/api/authApi'
import { useAuthStore } from '../src/stores/authStore'
import { useTaskStore } from '../src/stores/taskStore'

// Variable starting with 'mock' so it is allowed in hoisted vi.mock calls
let mockUnauthorizedCb: (() => void) | null = null

vi.mock('../src/api/authApi')
vi.mock('../src/api/taskApi', () => ({
  onUnauthorized: vi.fn((cb) => {
    mockUnauthorizedCb = cb
  }),
  apiClient: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('initializes with empty token and user', () => {
    const store = useAuthStore()
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('restores token and user from localStorage on init', () => {
    localStorage.setItem('auth_token', 'saved-token')
    localStorage.setItem('auth_user', JSON.stringify({ id: 5, username: 'saved-user' }))

    const store = useAuthStore()
    expect(store.token).toBe('saved-token')
    expect(store.user).toEqual({ id: 5, username: 'saved-user' })
    expect(store.isAuthenticated).toBe(true)
  })

  it('registers user and updates state and localStorage', async () => {
    const response = { token: 'reg-token', userId: 42, username: 'newuser' }
    vi.mocked(authApi.register).mockResolvedValue(response)

    const store = useAuthStore()
    await store.register('newuser', 'password123')

    expect(authApi.register).toHaveBeenCalledWith('newuser', 'password123')
    expect(store.token).toBe('reg-token')
    expect(store.user).toEqual({ id: 42, username: 'newuser' })
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem('auth_token')).toBe('reg-token')
    expect(JSON.parse(localStorage.getItem('auth_user') || '{}')).toEqual({ id: 42, username: 'newuser' })
  })

  it('logins user and updates state and localStorage', async () => {
    const response = { token: 'login-token', userId: 10, username: 'myuser' }
    vi.mocked(authApi.login).mockResolvedValue(response)

    const store = useAuthStore()
    await store.login('myuser', 'password123')

    expect(authApi.login).toHaveBeenCalledWith('myuser', 'password123')
    expect(store.token).toBe('login-token')
    expect(store.user).toEqual({ id: 10, username: 'myuser' })
    expect(localStorage.getItem('auth_token')).toBe('login-token')
  })

  it('louts and resets task list and localStorage', () => {
    const store = useAuthStore()
    const taskStore = useTaskStore()
    
    // Simulate authenticated state
    store.token = 'active-token'
    store.user = { id: 1, username: 'test' }
    localStorage.setItem('auth_token', 'active-token')
    localStorage.setItem('auth_user', JSON.stringify({ id: 1, username: 'test' }))
    
    // Simulate populated task list
    taskStore.tasks = [{ id: 1, title: 'Task', description: '', status: 'Todo', createdAt: '' }]
    taskStore.totalCount = 1

    store.logout()

    expect(store.token).toBe('')
    expect(store.user).toBeNull()
    expect(localStorage.getItem('auth_token')).toBeNull()
    expect(localStorage.getItem('auth_user')).toBeNull()
    
    // Check task list reset
    expect(taskStore.tasks).toEqual([])
    expect(taskStore.totalCount).toBe(0)
  })

  it('fetches profile and updates user info', async () => {
    const profile = { id: 7, username: 'fetcheduser', createdAt: '2026-08-10' }
    vi.mocked(authApi.fetchMe).mockResolvedValue(profile)

    const store = useAuthStore()
    store.user = { id: 7, username: 'oldname' }

    await store.fetchMe()

    expect(authApi.fetchMe).toHaveBeenCalled()
    expect(store.user).toEqual({ id: 7, username: 'fetcheduser' })
    expect(JSON.parse(localStorage.getItem('auth_user') || '{}')).toEqual({ id: 7, username: 'fetcheduser' })
  })

  it('triggers logout automatically when unauthorized callback fires', () => {
    const store = useAuthStore()
    store.token = 'active-token'
    store.user = { id: 1, username: 'test' }

    expect(mockUnauthorizedCb).toBeTypeOf('function')
    
    // Fire the registered 401 callback
    if (mockUnauthorizedCb) {
      mockUnauthorizedCb()
    }

    expect(store.token).toBe('')
    expect(store.user).toBeNull()
  })
})
