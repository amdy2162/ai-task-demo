import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fetchMe as apiFetchMe, login as apiLogin, register as apiRegister } from '../api/authApi'
import { onUnauthorized } from '../api/taskApi'
import type { UserInfo } from '../types/auth'
import { useTaskStore } from './taskStore'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('auth_token') || '')
  
  const savedUser = localStorage.getItem('auth_user')
  const user = ref<UserInfo | null>(savedUser ? JSON.parse(savedUser) : null)

  const isAuthenticated = computed(() => !!token.value)

  async function register(username: string, password: string): Promise<void> {
    const res = await apiRegister(username, password)
    token.value = res.token
    user.value = { id: res.userId, username: res.username }
    localStorage.setItem('auth_token', res.token)
    localStorage.setItem('auth_user', JSON.stringify(user.value))
  }

  async function login(username: string, password: string): Promise<void> {
    const res = await apiLogin(username, password)
    token.value = res.token
    user.value = { id: res.userId, username: res.username }
    localStorage.setItem('auth_token', res.token)
    localStorage.setItem('auth_user', JSON.stringify(user.value))
  }

  function logout(): void {
    token.value = ''
    user.value = null
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')

    // Reset task list
    const taskStore = useTaskStore()
    taskStore.tasks = []
    taskStore.totalCount = 0
  }

  async function fetchMe(): Promise<void> {
    const profile = await apiFetchMe()
    user.value = { id: profile.id, username: profile.username }
    localStorage.setItem('auth_user', JSON.stringify(user.value))
  }

  // Register the global 401 interceptor callback to automatically log out
  onUnauthorized(() => {
    logout()
  })

  return {
    token,
    user,
    isAuthenticated,
    register,
    login,
    logout,
    fetchMe,
  }
})
