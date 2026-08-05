import type { Profile } from '@/shared/types/profile'
import type { CalendarEvent } from '../types/calendar-event'
import type { CalendarPermissions } from '../types/calendar-permissions'

export function getCalendarPermissions(profile: Profile | null): CalendarPermissions {
  const role = profile?.role
  const canAccess = Boolean(profile?.household_id && role && role !== 'guest')
  const owns = (event: Pick<CalendarEvent, 'createdBy'>) =>
    Boolean(profile && (role === 'admin' || event.createdBy === profile.id))
  return {
    canAccess,
    canCreate: canAccess,
    canCreateFamilyEvent: role === 'admin' || role === 'adult',
    canManageCategories: role === 'admin',
    canEdit: owns,
    canDelete: owns,
    profile
  }
}

export function validateParticipantPermission(
  profile: Profile,
  ids: string[],
  family: boolean
): string | null {
  if (profile.role === 'guest') return 'Gäster har inte tillgång till kalendern.'
  if (!ids.length) return 'Välj minst en deltagare.'
  if (profile.role === 'member' && family) return 'Du får inte välja Hela familjen.'
  if (profile.role === 'member' && !ids.includes(profile.id))
    return 'Du måste själv vara deltagare i aktiviteten.'
  return null
}
