import { useQuery } from '@tanstack/react-query'
import type { CalendarFilters } from '../types/calendar-filter'
import { generateOccurrences } from '../utils/calendar-recurrence'
import { getCalendarEvents } from '../services/calendar-event.service'

export function useCalendarEvents(
  start: Date,
  end: Date,
  filters: CalendarFilters,
  profileId?: string
) {
  return useQuery({
    queryKey: ['calendar-events', start.toISOString(), end.toISOString()],
    queryFn: () => getCalendarEvents(start, end),
    select: (rows) =>
      rows
        .flatMap(({ event, recurrence }) => generateOccurrences(event, recurrence, start, end))
        .filter((occurrence) => {
          const event = occurrence.event
          if (
            filters.mineOnly &&
            (!profileId || !event.participants.some((person) => person.id === profileId))
          )
            return false
          if (filters.familyOnly && !event.isFamilyEvent) return false
          if (
            filters.participantIds.length &&
            !filters.participantIds.some((id) =>
              event.participants.some((person) => person.id === id)
            )
          )
            return false
          if (
            filters.categoryIds.length &&
            (!event.categoryId || !filters.categoryIds.includes(event.categoryId))
          )
            return false
          return true
        })
  })
}
