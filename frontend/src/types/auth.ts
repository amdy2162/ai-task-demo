export interface UserInfo {
  id: number
  username: string
}

export interface AuthResponse {
  token: string
  user: UserProfile
}

export interface UserProfile {
  id: number
  username: string
  createdAt: string
}
