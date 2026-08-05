export interface CalendarFilters {
  participantIds: string[]
  categoryIds: string[]
  mineOnly: boolean
  familyOnly: boolean
}

export const EMPTY_CALENDAR_FILTERS: CalendarFilters = {
  participantIds: [],
  categoryIds: [],
  mineOnly: false,
  familyOnly: false
}
