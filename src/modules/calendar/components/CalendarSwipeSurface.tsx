import type { ReactNode } from 'react'
import { useCalendarSwipe } from '../hooks/useCalendarSwipe'

export function CalendarSwipeSurface({
  enabled,
  onSwipe,
  children
}: {
  enabled: boolean
  onSwipe: (direction: -1 | 1) => void
  children: ReactNode
}) {
  const handlers = useCalendarSwipe(onSwipe)
  return (
    <div
      className="calendar-swipe-surface"
      data-swipe-enabled={enabled}
      {...(enabled ? handlers : {})}
    >
      {children}
    </div>
  )
}
