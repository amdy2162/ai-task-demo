export interface UserInfo {
  id: number
  username: string
}

export interface AuthResponse {
  token: string
  userId: number
  username: string
}

export interface UserProfile {
  id: number
  username: string
  createdAt: string
}
