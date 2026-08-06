import type { FamilyAuditEntry, FamilyRole } from '../types/family'

export const roleLabels: Record<FamilyRole, string> = {
  admin: 'Administratör',
  adult: 'Vuxen',
  member: 'Medlem',
  guest: 'Gäst'
}

export function formatFamilyDate(value: string | null): string {
  if (!value) return '–'
  return new Intl.DateTimeFormat('sv-SE', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  )
}

export function formatAuditEntry(entry: FamilyAuditEntry): string {
  const actor = entry.actor_name || 'Systemet'
  const target = entry.target_name || 'en inbjudan'
  const messages: Record<FamilyAuditEntry['action'], string> = {
    invitation_created: `${actor} skapade en inbjudan`,
    invitation_delivery_failed: `E-postleveransen för en inbjudan misslyckades`,
    invitation_revoked: `${actor} återkallade en inbjudan`,
    invitation_accepted: `${target} accepterade inbjudan`,
    role_changed: `${actor} ändrade roll för ${target}`,
    color_changed: `${actor} ändrade profilfärg för ${target}`,
    member_deactivated: `${actor} avaktiverade ${target}`,
    member_reactivated: `${actor} återaktiverade ${target}`
  }
  return messages[entry.action]
}

export function familyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('FAMILY_LAST_ADMIN')) {
    return 'Hushållet måste ha minst en aktiv administratör.'
  }
  if (message.includes('FAMILY_FORBIDDEN')) {
    return 'Du har inte behörighet att utföra denna åtgärd.'
  }
  return 'Medlemmen kunde inte uppdateras.'
}
