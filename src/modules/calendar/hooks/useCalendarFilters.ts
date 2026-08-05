import { useState } from 'react'
import { EMPTY_CALENDAR_FILTERS, type CalendarFilters } from '../types/calendar-filter'

export function useCalendarFilters() {
  const [filters, setFilters] = useState<CalendarFilters>(EMPTY_CALENDAR_FILTERS)
  const toggleInList = (key: 'participantIds' | 'categoryIds', id: string) =>
    setFilters((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((value) => value !== id)
        : [...current[key], id]
    }))
  return {
    filters,
    toggleParticipant: (id: string) => toggleInList('participantIds', id),
    toggleCategory: (id: string) => toggleInList('categoryIds', id),
    setMineOnly: (value: boolean) => setFilters((current) => ({ ...current, mineOnly: value })),
    setFamilyOnly: (value: boolean) => setFilters((current) => ({ ...current, familyOnly: value })),
    clearFilters: () => setFilters(EMPTY_CALENDAR_FILTERS)
  }
}
