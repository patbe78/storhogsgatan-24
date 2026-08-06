import type { FamilyInvitation } from '@/modules/family/types/family'

export const invitationStatusLabels: Record<FamilyInvitation['status'], string> = {
  pending: 'Väntar',
  accepted: 'Accepterad',
  revoked: 'Återkallad',
  expired: 'Utgången',
  delivery_failed: 'Leverans misslyckades',
  temporarily_locked: 'Tillfälligt låst'
}

export function isRevocableInvitation(invitation: FamilyInvitation): boolean {
  return ['pending', 'delivery_failed', 'temporarily_locked'].includes(invitation.status)
}
