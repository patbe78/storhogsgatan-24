import { addDays, addWeeks, getISOWeek, startOfWeek } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'
import type { CalendarOccurrence } from '@/modules/calendar/types/calendar-event'
import { CALENDAR_TIME_ZONE } from '@/modules/calendar/utils/calendar-dates'
import type { DashboardDateRange } from '../types/dashboard'

function capitalize(value: string): string {
  return value ? `${value[0].toLocaleUpperCase('sv-SE')}${value.slice(1)}` : value
}

function localBoundary(date: Date): Date {
  return fromZonedTime(date, CALENDAR_TIME_ZONE)
}

export function dashboardTodayRange(now: Date): DashboardDateRange {
  const zonedNow = toZonedTime(now, CALENDAR_TIME_ZONE)
  const start = new Date(zonedNow.getFullYear(), zonedNow.getMonth(), zonedNow.getDate())
  return { start: localBoundary(start), end: localBoundary(addDays(start, 15)) }
}

export function dashboardWeekRange(now: Date, offset: 0 | 1): DashboardDateRange {
  const zonedNow = toZonedTime(now, CALENDAR_TIME_ZONE)
  const localStart = addWeeks(startOfWeek(zonedNow, { weekStartsOn: 1 }), offset)
  return { start: localBoundary(localStart), end: localBoundary(addWeeks(localStart, 1)) }
}

export function dashboardDataRange(now: Date): DashboardDateRange {
  const upcoming = dashboardTodayRange(now)
  const currentWeek = dashboardWeekRange(now, 0)
  const nextWeek = dashboardWeekRange(now, 1)
  return {
    start: currentWeek.start < upcoming.start ? currentWeek.start : upcoming.start,
    end: nextWeek.end > upcoming.end ? nextWeek.end : upcoming.end
  }
}

export function dashboardIsoWeek(now: Date, offset: 0 | 1 = 0): number {
  return getISOWeek(addWeeks(toZonedTime(now, CALENDAR_TIME_ZONE), offset))
}

export function dashboardDateLabel(now: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: CALENDAR_TIME_ZONE
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${capitalize(value('weekday'))} ${value('day')} ${capitalize(value('month'))}`
}

export function dashboardOccurrenceDateLabel(occurrence: CalendarOccurrence): string {
  const endForDisplay = new Date(
    new Date(occurrence.endsAt).getTime() - (occurrence.allDay ? 1 : 0)
  )
  const startKey = formatInTimeZone(occurrence.startsAt, CALENDAR_TIME_ZONE, 'yyyy-MM-dd')
  const endKey = formatInTimeZone(endForDisplay, CALENDAR_TIME_ZONE, 'yyyy-MM-dd')
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: CALENDAR_TIME_ZONE
  })
  const startLabel = capitalize(formatter.format(new Date(occurrence.startsAt)))
  if (startKey === endKey) return startLabel
  return `${startLabel}–${capitalize(formatter.format(endForDisplay))}`
}

export function dashboardWeekdayLabel(date: Date | string): string {
  const labels = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
  const isoWeekday = Number(formatInTimeZone(date, CALENDAR_TIME_ZONE, 'i'))
  return labels[isoWeekday - 1]
}

export function intervalsOverlap(
  startsAt: string,
  endsAt: string,
  range: DashboardDateRange
): boolean {
  return new Date(startsAt) < range.end && new Date(endsAt) > range.start
}

export function occurrenceBelongsToDashboardWeek(
  occurrence: CalendarOccurrence,
  range: DashboardDateRange
): boolean {
  if (occurrence.allDay) return intervalsOverlap(occurrence.startsAt, occurrence.endsAt, range)
  const startsAt = new Date(occurrence.startsAt)
  return startsAt >= range.start && startsAt < range.end
}
