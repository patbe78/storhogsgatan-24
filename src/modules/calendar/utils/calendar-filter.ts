import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEvent, CalendarEventParticipant } from '../types/calendar-event'
import {
  UNCATEGORIZED_FILTER_CATEGORY,
  type CalendarDefaultFilter,
  type CalendarFilterCategoryIdentity,
  type CalendarFilterCell,
  type CalendarFilterMatrixValue
} from '../types/calendar-filter'

export interface CalendarFilterColumn {
  identity: CalendarFilterCategoryIdentity
  label: string
}

export function calendarFilterCategoryKey(identity: CalendarFilterCategoryIdentity): string {
  return identity.kind === 'uncategorized' ? 'uncategorized' : `category:${identity.categoryId}`
}

export function calendarFilterCellKey(cell: CalendarFilterCell): string {
  return `${cell.participantProfileId}|${calendarFilterCategoryKey(cell.category)}`
}

export function calendarFilterColumns(categories: CalendarCategory[]): CalendarFilterColumn[] {
  return [
    { identity: UNCATEGORIZED_FILTER_CATEGORY, label: 'Ingen kategori' },
    ...categories
      .filter((category) => !category.isArchived)
      .map((category) => ({
        identity: { kind: 'category' as const, categoryId: category.id },
        label: category.name
      }))
  ]
}

export function selectedCalendarFilterCellKeys(value: CalendarFilterMatrixValue): Set<string> {
  return new Set(value.selectedCells.map(calendarFilterCellKey))
}

export function createShowAllCalendarFilter(
  profiles: CalendarEventParticipant[],
  categories: CalendarCategory[]
): CalendarFilterMatrixValue {
  return {
    selectedCells: profiles.flatMap((profile) =>
      calendarFilterColumns(categories).map((column) => ({
        participantProfileId: profile.id,
        category: column.identity
      }))
    )
  }
}

export function createCalendarFilterFromDefault(
  saved: CalendarDefaultFilter,
  profiles: CalendarEventParticipant[],
  categories: CalendarCategory[]
): CalendarFilterMatrixValue {
  if (!saved.hasCustomDefault) return createShowAllCalendarFilter(profiles, categories)

  const allowed = selectedCalendarFilterCellKeys(createShowAllCalendarFilter(profiles, categories))
  return {
    selectedCells: saved.selectedCells.filter((cell) => allowed.has(calendarFilterCellKey(cell)))
  }
}

export function setCalendarFilterCell(
  value: CalendarFilterMatrixValue,
  cell: CalendarFilterCell,
  selected: boolean
): CalendarFilterMatrixValue {
  const key = calendarFilterCellKey(cell)
  const cells = new Map(
    value.selectedCells.map((current) => [calendarFilterCellKey(current), current])
  )
  if (selected) cells.set(key, cell)
  else cells.delete(key)
  return { selectedCells: [...cells.values()] }
}

export function setCalendarFilterCells(
  value: CalendarFilterMatrixValue,
  cells: CalendarFilterCell[],
  selected: boolean
): CalendarFilterMatrixValue {
  return cells.reduce((current, cell) => setCalendarFilterCell(current, cell, selected), value)
}

export function eventMatchesCalendarFilter(
  event: CalendarEvent,
  selectedCellKeys: ReadonlySet<string>
): boolean {
  const category: CalendarFilterCategoryIdentity = event.categoryId
    ? { kind: 'category', categoryId: event.categoryId }
    : UNCATEGORIZED_FILTER_CATEGORY

  return event.participants.some((participant) =>
    selectedCellKeys.has(calendarFilterCellKey({ participantProfileId: participant.id, category }))
  )
}
