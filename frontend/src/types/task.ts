export type TaskStatus = 'Todo' | 'Doing' | 'Done'

export interface TaskItem {
  id: number
  title: string
  description: string
  status: TaskStatus
  createdAt: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  status?: TaskStatus
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}
