import { apiClient } from './taskApi'
import type { AuthResponse, UserProfile } from '../types/auth'

export async function register(username: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', { username, password })
  return response.data
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', { username, password })
  return response.data
}

export async function fetchMe(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>('/auth/me')
  return response.data
}
