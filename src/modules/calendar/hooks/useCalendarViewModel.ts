import { useMemo } from 'react'
import type { CalendarOccurrence } from '../types/calendar-event'
import type { CalendarView } from '../types/calendar-view'
import { createCalendarViewModel } from '../adapters/calendar-view.adapter'

export function useCalendarViewModel(
  view: CalendarView,
  anchor: Date,
  occurrences: CalendarOccurrence[]
) {
  return useMemo(
    () => createCalendarViewModel(view, anchor, occurrences),
    [view, anchor, occurrences]
  )
}
