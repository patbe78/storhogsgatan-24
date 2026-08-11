import { useEffect, useRef, useState } from 'react'
import type { CalendarCategory } from '../types/calendar-category'
import type { CalendarEventParticipant } from '../types/calendar-event'
import type { CalendarDefaultFilter, CalendarFilterMatrixValue } from '../types/calendar-filter'
import { createCalendarFilterFromDefault } from '../utils/calendar-filter'

export function useCalendarFilters(
  savedDefault: CalendarDefaultFilter | undefined,
  profiles: CalendarEventParticipant[] | undefined,
  categories: CalendarCategory[] | undefined
) {
  const initialized = useRef(false)
  const [filters, setFilters] = useState<CalendarFilterMatrixValue | null>(null)

  useEffect(() => {
    if (initialized.current || !savedDefault || !profiles || !categories) return
    initialized.current = true
    setFilters(createCalendarFilterFromDefault(savedDefault, profiles, categories))
  }, [savedDefault, profiles, categories])

  return { filters, setFilters }
}
