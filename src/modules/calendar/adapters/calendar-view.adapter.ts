import { isSameMonth } from 'date-fns'
import type { CalendarOccurrence } from '../types/calendar-event'
import type { CalendarView, CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { getEventColor } from '../utils/calendar-colors'
import {
  calendarRange,
  datesBetween,
  format,
  isSameDay,
  parseISO,
  rangeTitle,
  toDateKey
} from '../utils/calendar-dates'
import { occurrenceDateLabel, occurrenceTimeLabel } from '../utils/calendar-display'

export function toCalendarViewItem(occurrence: CalendarOccurrence): CalendarViewItem {
  const dateLabel = occurrenceDateLabel(occurrence)
  const timeLabel = occurrenceTimeLabel(occurrence)
  const names = occurrence.event.participants.map((participant) => participant.name).join(', ')
  return {
    key: occurrence.key,
    eventId: occurrence.event.id,
    title: occurrence.event.title,
    dateLabel,
    timeLabel,
    accessibilityLabel: `${occurrence.event.title}, ${dateLabel}, ${timeLabel}, deltagare ${names}`,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    allDay: occurrence.allDay,
    color: getEventColor(occurrence.event.participants, occurrence.event.isFamilyEvent),
    categoryColor: occurrence.event.categoryColor,
    participants: occurrence.event.participants,
    occurrence
  }
}

export function createCalendarViewModel(
  view: CalendarView,
  anchor: Date,
  occurrences: CalendarOccurrence[]
): CalendarViewModel {
  const range = calendarRange(view, anchor)
  const items = occurrences
    .map(toCalendarViewItem)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const days = datesBetween(range.start, range.end).map((date) => ({
    date: toDateKey(date),
    label: format(date, view === 'month' ? 'd' : 'EEE d/M'),
    isToday: isSameDay(date, new Date()),
    isOutsidePeriod: view === 'month' && !isSameMonth(date, anchor),
    items: items.filter((item) => {
      const start = parseISO(item.startsAt)
      const end = parseISO(item.endsAt)
      return item.allDay
        ? date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && date < end
        : isSameDay(start, date)
    })
  }))
  return {
    title: rangeTitle(view, anchor),
    rangeStart: range.start,
    rangeEnd: range.end,
    days,
    items
  }
}
