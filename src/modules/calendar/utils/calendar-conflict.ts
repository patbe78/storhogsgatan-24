import type { CalendarOccurrence } from '../types/calendar-event'

export interface CalendarConflict {
  participantId: string
  participantName: string
  conflictingOccurrence: CalendarOccurrence
}

export function findCalendarConflicts(
  candidate: CalendarOccurrence,
  existing: CalendarOccurrence[]
): CalendarConflict[] {
  const candidateIds = new Set(candidate.event.participants.map((participant) => participant.id))
  const start = Date.parse(candidate.startsAt)
  const end = Date.parse(candidate.endsAt)
  const found: CalendarConflict[] = []
  for (const occurrence of existing) {
    if (
      occurrence.event.id === candidate.event.id ||
      Date.parse(occurrence.startsAt) >= end ||
      Date.parse(occurrence.endsAt) <= start
    )
      continue
    for (const participant of occurrence.event.participants) {
      if (candidateIds.has(participant.id))
        found.push({
          participantId: participant.id,
          participantName: participant.name,
          conflictingOccurrence: occurrence
        })
    }
  }
  return found.filter(
    (item, index, all) =>
      all.findIndex(
        (other) =>
          other.participantId === item.participantId &&
          other.conflictingOccurrence.key === item.conflictingOccurrence.key
      ) === index
  )
}
