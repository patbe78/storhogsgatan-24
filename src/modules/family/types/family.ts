export type FamilyRole = 'admin' | 'adult' | 'member' | 'guest'

export interface FamilyMember {
  id: string
  name: string
  email: string
  role: FamilyRole
  color: string | null
  is_active: boolean
  joined_at: string
  deactivated_at: string | null
}

export interface FamilyInvitation {
  id: string
  invited_name: string
  email: string
  role: 'adult' | 'member'
  profile_color: string
  invited_by_name: string
  created_at: string
  expires_at: string
  delivery_status: 'pending' | 'sent' | 'failed'
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'delivery_failed' | 'temporarily_locked'
}

export interface FamilyAuditEntry {
  id: string
  actor_name: string | null
  target_name: string | null
  invitation_id: string | null
  action:
    | 'invitation_created'
    | 'invitation_delivery_failed'
    | 'invitation_revoked'
    | 'invitation_accepted'
    | 'role_changed'
    | 'color_changed'
    | 'member_deactivated'
    | 'member_reactivated'
  metadata: Record<string, unknown>
  created_at: string
}
