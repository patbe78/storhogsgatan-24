import type { CalendarOccurrence } from '../types/calendar-event'
import { findCalendarConflicts, type CalendarConflict } from '../utils/calendar-conflict'
import { generateOccurrences } from '../utils/calendar-recurrence'
import { getCalendarEvents } from './calendar-event.service'

export async function checkCalendarConflicts(
  candidate: CalendarOccurrence
): Promise<CalendarConflict[]> {
  const start = new Date(candidate.startsAt)
  const end = new Date(candidate.endsAt)
  const rows = await getCalendarEvents(start, end)
  const existing = rows.flatMap(({ event, recurrence }) =>
    generateOccurrences(event, recurrence, start, end)
  )
  return findCalendarConflicts(candidate, existing)
}
