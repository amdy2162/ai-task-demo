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

    // 重設任務清單並中斷 WebSocket 即時連線
    const taskStore = useTaskStore()
    taskStore.tasks = []
    taskStore.totalCount = 0
    void taskStore.stopRealtime()
  }

  async function fetchMe(): Promise<void> {
    const profile = await apiFetchMe()
    user.value = { id: profile.id, username: profile.username }
    localStorage.setItem('auth_user', JSON.stringify(user.value))
  }

  // 註冊全域 401 攔截器，在憑證過期時自動執行登出並斷開 WebSocket
  onUnauthorized(() => {
    logout()
  })

  // 監聽跨分頁的 Storage 變更，同步登入與登出狀態
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_token') {
        const taskStore = useTaskStore()
        if (!event.newValue) {
          // 另一頁登出時，這一頁同步登出並斷開連線
          token.value = ''
          user.value = null
          taskStore.tasks = []
          taskStore.totalCount = 0
          void taskStore.stopRealtime()
        } else {
          // 另一頁登入時，這一頁同步登入並重啟連線
          token.value = event.newValue
          const saved = localStorage.getItem('auth_user')
          user.value = saved ? JSON.parse(saved) : null
          void taskStore.fetchTasks()
          void taskStore.stopRealtime().then(() => taskStore.startRealtime())
        }
      }
    })
  }

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
