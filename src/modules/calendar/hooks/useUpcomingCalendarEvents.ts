import { useQuery } from '@tanstack/react-query'
import { addYears } from '../utils/calendar-dates'
import { generateOccurrences } from '../utils/calendar-recurrence'
import { getCalendarEvents } from '../services/calendar-event.service'
import { toCalendarViewItem } from '../adapters/calendar-view.adapter'

export function useUpcomingCalendarEvents(profileId?: string, limit = 5) {
  const start = new Date()
  const end = addYears(start, 1)
  return useQuery({
    queryKey: ['calendar-events', 'upcoming', profileId, limit],
    enabled: Boolean(profileId),
    queryFn: () => getCalendarEvents(start, end),
    select: (rows) =>
      rows
        .flatMap(({ event, recurrence }) => generateOccurrences(event, recurrence, start, end))
        .filter(
          (item) =>
            item.event.isFamilyEvent ||
            item.event.participants.some((person) => person.id === profileId)
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, limit)
        .map(toCalendarViewItem)
  })
}
