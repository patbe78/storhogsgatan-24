import type { Profile } from '@/shared/types/profile'
import type { CalendarEvent } from './calendar-event'

export interface CalendarPermissions {
  canAccess: boolean
  canCreate: boolean
  canCreateFamilyEvent: boolean
  canManageCategories: boolean
  canEdit: (event: Pick<CalendarEvent, 'createdBy'>) => boolean
  canDelete: (event: Pick<CalendarEvent, 'createdBy'>) => boolean
  profile: Profile | null
}
