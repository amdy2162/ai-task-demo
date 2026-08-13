import axios from 'axios'
import type { CreateTaskRequest, PagedResult, TaskItem, TaskStatus } from '../types/task'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
})

let onUnauthorizedCallback: (() => void) | null = null

export function onUnauthorized(callback: () => void): void {
  onUnauthorizedCallback = callback
}

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token')
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback()
      }
    }
    return Promise.reject(error)
  }
)

export async function getTasks(params?: {
  status?: TaskStatus
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}): Promise<PagedResult<TaskItem>> {
  const response = await apiClient.get<PagedResult<TaskItem>>('/tasks', {
    params,
  })
  return response.data
}

export async function createTask(request: CreateTaskRequest): Promise<TaskItem> {
  const response = await apiClient.post<TaskItem>('/tasks', request)
  return response.data
}

export async function updateTaskStatus(id: number, status: TaskStatus): Promise<TaskItem> {
  const response = await apiClient.patch<TaskItem>(`/tasks/${id}/status`, { status })
  return response.data
}

export async function deleteTask(id: number): Promise<void> {
  await apiClient.delete(`/tasks/${id}`)
}
