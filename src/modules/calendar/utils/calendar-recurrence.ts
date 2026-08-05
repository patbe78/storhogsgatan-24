import { differenceInMilliseconds } from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { CalendarEvent, CalendarOccurrence } from '../types/calendar-event'
import type { CalendarRecurrenceRule } from '../types/calendar-recurrence'
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  allDayBounds,
  CALENDAR_TIME_ZONE,
  occursInRange,
  parseISO,
  toDateKey
} from './calendar-dates'

const MAX_SCANNED_OCCURRENCES = 5000
const MAX_RETURNED_OCCURRENCES = 1000

function advance(date: Date, rule: CalendarRecurrenceRule): Date {
  const interval = rule.intervalValue
  const zoned = toZonedTime(date, CALENDAR_TIME_ZONE)
  const next =
    rule.frequency === 'daily'
      ? addDays(zoned, interval)
      : rule.frequency === 'weekly'
        ? addWeeks(zoned, interval)
        : rule.frequency === 'monthly'
          ? addMonths(zoned, interval)
          : addYears(zoned, interval)
  return fromZonedTime(next, CALENDAR_TIME_ZONE)
}

export function singleOccurrence(event: CalendarEvent): CalendarOccurrence {
  const bounds = event.allDay
    ? allDayBounds(event.allDayStart!, event.allDayEnd!)
    : { start: event.startsAt!, end: event.endsAt! }
  return {
    key: `${event.id}:${bounds.start}`,
    event,
    startsAt: bounds.start,
    endsAt: bounds.end,
    allDay: event.allDay,
    occurrenceDate: toDateKey(parseISO(bounds.start)),
    recurrence: null
  }
}

export function generateOccurrences(
  event: CalendarEvent,
  rule: CalendarRecurrenceRule | null,
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence[] {
  const first = singleOccurrence(event)
  if (!rule) return occursInRange(first.startsAt, first.endsAt, rangeStart, rangeEnd) ? [first] : []

  const duration = differenceInMilliseconds(parseISO(first.endsAt), parseISO(first.startsAt))
  const results: CalendarOccurrence[] = []
  let cursor = parseISO(first.startsAt)
  let index = 0
  while (index < MAX_SCANNED_OCCURRENCES && results.length < MAX_RETURNED_OCCURRENCES) {
    const dateKey = toDateKey(cursor)
    if (rule.endsOn && dateKey > rule.endsOn) break
    if (rule.occurrenceCount != null && index >= rule.occurrenceCount) break
    const end = new Date(cursor.getTime() + duration)
    if (occursInRange(cursor.toISOString(), end.toISOString(), rangeStart, rangeEnd)) {
      results.push({
        key: `${event.id}:${cursor.toISOString()}`,
        event,
        startsAt: cursor.toISOString(),
        endsAt: end.toISOString(),
        allDay: event.allDay,
        occurrenceDate: dateKey,
        recurrence: rule
      })
    }
    if (cursor > rangeEnd && !rule.occurrenceCount) break
    cursor = advance(cursor, rule)
    index += 1
  }
  return results
}

export function occurrencesBefore(
  rule: CalendarRecurrenceRule,
  firstStart: Date,
  splitDate: string
): number {
  let cursor = firstStart
  let count = 0
  while (toDateKey(cursor) < splitDate && count < MAX_SCANNED_OCCURRENCES) {
    count += 1
    cursor = advance(cursor, rule)
  }
  return count
}
