import { formatInTimeZone } from 'date-fns-tz'
import type { CalendarOccurrence } from '../types/calendar-event'
import { CALENDAR_TIME_ZONE } from './calendar-dates'

export function occurrenceTimeLabel(item: CalendarOccurrence): string {
  if (item.allDay) return 'Heldag'
  return `${formatInTimeZone(item.startsAt, CALENDAR_TIME_ZONE, 'HH:mm')}–${formatInTimeZone(item.endsAt, CALENDAR_TIME_ZONE, 'HH:mm')}`
}

export function occurrenceDateLabel(item: CalendarOccurrence): string {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: CALENDAR_TIME_ZONE
  }).format(new Date(item.startsAt))
}
