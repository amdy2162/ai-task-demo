export interface UserInfo {
  id: number
  username: string
  role: 'Admin' | 'Editor' | 'Viewer'
}

export interface AuthResponse {
  token: string
  user: UserProfile
}

export interface UserProfile {
  id: number
  username: string
  createdAt: string
  role: 'Admin' | 'Editor' | 'Viewer'
}
