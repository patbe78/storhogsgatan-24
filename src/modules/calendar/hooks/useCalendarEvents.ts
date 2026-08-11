import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth'
import type { CalendarFilterMatrixValue } from '../types/calendar-filter'
import { generateOccurrences } from '../utils/calendar-recurrence'
import { getCalendarEvents } from '../services/calendar-event.service'
import {
  eventMatchesCalendarFilter,
  selectedCalendarFilterCellKeys
} from '../utils/calendar-filter'

export function useCalendarEvents(
  start: Date,
  end: Date,
  filters: CalendarFilterMatrixValue | null
) {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['calendar-events', userId, start.toISOString(), end.toISOString()],
    queryFn: () => getCalendarEvents(start, end),
    enabled: Boolean(userId),
    select: (rows) => {
      if (!filters) return []
      const selectedCells = selectedCalendarFilterCellKeys(filters)
      return rows
        .flatMap(({ event, recurrence }) => generateOccurrences(event, recurrence, start, end))
        .filter((occurrence) => eventMatchesCalendarFilter(occurrence.event, selectedCells))
    }
  })
}
