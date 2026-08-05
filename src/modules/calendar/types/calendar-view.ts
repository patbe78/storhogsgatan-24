import type { CalendarEventParticipant, CalendarOccurrence } from './calendar-event'

export type CalendarView = 'month' | 'week' | 'day' | 'agenda'

export interface CalendarViewItem {
  key: string
  eventId: string
  title: string
  dateLabel: string
  timeLabel: string
  accessibilityLabel: string
  startsAt: string
  endsAt: string
  allDay: boolean
  color: string
  categoryColor: string | null
  participants: CalendarEventParticipant[]
  occurrence: CalendarOccurrence
}

export interface CalendarDayModel {
  date: string
  label: string
  isToday: boolean
  isOutsidePeriod: boolean
  items: CalendarViewItem[]
}

export interface CalendarViewModel {
  title: string
  rangeStart: Date
  rangeEnd: Date
  days: CalendarDayModel[]
  items: CalendarViewItem[]
}
