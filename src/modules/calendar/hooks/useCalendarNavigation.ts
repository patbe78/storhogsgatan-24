import { useCallback, useState } from 'react'
import type { CalendarView } from '../types/calendar-view'
import { moveCalendarPeriod } from '../utils/calendar-dates'

export function useCalendarNavigation() {
  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState(() => new Date())
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
