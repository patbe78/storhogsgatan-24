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

export async function checkCalendarSeriesConflicts(candidates: CalendarOccurrence[]): Promise<{
  conflicts: CalendarConflict[]
  conflictingOccurrenceCount: number
}> {
  if (!candidates.length) return { conflicts: [], conflictingOccurrenceCount: 0 }
  const start = new Date(Math.min(...candidates.map((candidate) => Date.parse(candidate.startsAt))))
  const end = new Date(Math.max(...candidates.map((candidate) => Date.parse(candidate.endsAt))))
  const rows = await getCalendarEvents(start, end)
  const existing = rows.flatMap(({ event, recurrence }) =>
    generateOccurrences(event, recurrence, start, end)
  )
  const conflicts = candidates.flatMap((candidate) =>
    findCalendarConflicts(candidate, existing).map((conflict) => ({
      ...conflict,
      candidateOccurrence: candidate
    }))
  )
  return {
    conflicts,
    conflictingOccurrenceCount: new Set(
      conflicts.map((conflict) => conflict.candidateOccurrence!.key)
    ).size
  }
}
