import axios from 'axios'
import type { CreateTaskRequest, TaskItem, TaskStatus } from '../types/task'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
})

export async function getTasks(status?: TaskStatus): Promise<TaskItem[]> {
  const response = await apiClient.get<TaskItem[]>('/tasks', {
    params: status ? { status } : undefined,
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
