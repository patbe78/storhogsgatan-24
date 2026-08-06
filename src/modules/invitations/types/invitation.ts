export interface InvitationInput {
  name: string
  email: string
  role: 'adult' | 'member'
  profileColor: string
}

export interface InvitationPreview {
  name: string
  email: string
  role: 'adult' | 'member'
  profileColor: string
  householdName: string
  expiresAt: string
  accountExists: boolean
}

export interface InvitationResponse {
  ok: boolean
  code?: string
  message?: string
  invitation?: InvitationPreview
  loginRequired?: boolean
}
