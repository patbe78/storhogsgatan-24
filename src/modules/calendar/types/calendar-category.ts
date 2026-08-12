export interface CalendarCategory {
  id: string
  householdId: string
  name: string
  icon: string | null
  color: string | null
  isArchived: boolean
  isSystem: boolean
}

export interface CalendarCategoryInput {
  id?: string
  name: string
  icon?: string | null
  color?: string | null
  isArchived?: boolean
}
