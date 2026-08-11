export type CalendarFilterCategoryIdentity =
  { kind: 'uncategorized' } | { kind: 'category'; categoryId: string }

export interface CalendarFilterCell {
  participantProfileId: string
  category: CalendarFilterCategoryIdentity
}

export interface CalendarFilterMatrixValue {
  selectedCells: CalendarFilterCell[]
}

export interface CalendarDefaultFilter extends CalendarFilterMatrixValue {
  hasCustomDefault: boolean
}

export const UNCATEGORIZED_FILTER_CATEGORY = { kind: 'uncategorized' } as const

export const EMPTY_CALENDAR_FILTER_MATRIX: CalendarFilterMatrixValue = {
  selectedCells: []
}
