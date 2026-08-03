export interface Profile {
  id: string
  name: string
  email: string
  role: 'admin' | 'adult' | 'member' | 'guest'
  avatar_url: string | null
  color: string | null
  created_at: string
  updated_at: string
}
