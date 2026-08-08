import { useCallback, useState } from 'react'
import type { CalendarView } from '../types/calendar-view'
import { moveCalendarPeriod, parseDateKey } from '../utils/calendar-dates'

function validDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = parseDateKey(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function useCalendarNavigation(linkedDate: string | null = null) {
  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState(() => validDate(linkedDate) ?? new Date())
  const move = useCallback(
    (direction: -1 | 1) => setAnchor((date) => moveCalendarPeriod(view, date, direction)),
    [view]
  )
  return {
    view,
    setView,
    anchor,
    setAnchor,
    today: () => setAnchor(new Date()),
    previous: () => move(-1),
    next: () => move(1)
  }
}
