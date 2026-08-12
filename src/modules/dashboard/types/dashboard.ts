import type { CalendarOccurrence } from '@/modules/calendar/types/calendar-event'
import type { Profile } from '@/shared/types/profile'

export type DashboardProfile = Pick<Profile, 'id' | 'name' | 'role' | 'color' | 'is_active'>

export interface DashboardOccurrenceItem {
  occurrence: CalendarOccurrence
  owners: DashboardProfile[]
}

export interface DashboardCategoryIdentity {
  canonicalName: string
  ids: ReadonlySet<string>
}

export interface DashboardDateRange {
  start: Date
  end: Date
}
