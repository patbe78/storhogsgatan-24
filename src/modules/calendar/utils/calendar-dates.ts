import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from 'date-fns'
import { sv } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { CalendarView } from '../types/calendar-view'

export const CALENDAR_TIME_ZONE = 'Europe/Stockholm'

export function toDateKey(date: Date): string {
  return formatInTimeZone(date, CALENDAR_TIME_ZONE, 'yyyy-MM-dd')
}

export function stockholmLocalToIso(date: string, time: string): string {
  return fromZonedTime(`${date}T${time}:00`, CALENDAR_TIME_ZONE).toISOString()
}

export function allDayBounds(start: string, inclusiveEnd: string): { start: string; end: string } {
  const exclusiveEndKey = addDateKeyDays(inclusiveEnd, 1)
  return {
    start: fromZonedTime(`${start}T00:00:00`, CALENDAR_TIME_ZONE).toISOString(),
    end: fromZonedTime(`${exclusiveEndKey}T00:00:00`, CALENDAR_TIME_ZONE).toISOString()
  }
}

export function addDateKeyDays(value: string, amount: number): string {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + amount)).toISOString().slice(0, 10)
}

export function calendarRange(view: CalendarView, anchor: Date): { start: Date; end: Date } {
  if (view === 'day') return { start: startOfDay(anchor), end: endOfDay(anchor) }
  if (view === 'week')
    return {
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 })
    }
  if (view === 'agenda') return { start: startOfDay(anchor), end: endOfDay(addMonths(anchor, 3)) }
  return {
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 })
  }
}

export function moveCalendarPeriod(view: CalendarView, anchor: Date, direction: -1 | 1): Date {
  if (view === 'day') return addDays(anchor, direction)
  if (view === 'week') return addWeeks(anchor, direction)
  if (view === 'agenda') return addMonths(anchor, direction * 3)
  return addMonths(anchor, direction)
}

export function rangeTitle(view: CalendarView, anchor: Date): string {
  if (view === 'day') return format(anchor, 'EEEE d MMMM yyyy', { locale: sv })
  if (view === 'week') {
    const range = calendarRange(view, anchor)
    return `${format(range.start, 'd MMM', { locale: sv })}–${format(range.end, 'd MMM yyyy', { locale: sv })}`
  }
  if (view === 'agenda') return 'Kommande aktiviteter'
  return format(anchor, 'MMMM yyyy', { locale: sv })
}

export function occursInRange(startsAt: string, endsAt: string, start: Date, end: Date): boolean {
  return isBefore(parseISO(startsAt), end) && isAfter(parseISO(endsAt), start)
}

export function datesBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = []
  for (let cursor = startOfDay(start); !isAfter(cursor, end); cursor = addDays(cursor, 1))
    dates.push(cursor)
  return dates
}

export function parseDateKey(value: string): Date {
  return parseISO(`${value}T12:00:00`)
}

export { addDays, addMonths, addWeeks, addYears, format, isSameDay, parseISO, startOfDay }
