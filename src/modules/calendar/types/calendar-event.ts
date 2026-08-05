export type ReminderType =
  'none' | 'at_start' | '5_minutes' | '15_minutes' | '30_minutes' | '1_hour' | '1_day' | 'custom'

export interface CalendarEventParticipant {
  id: string
  name: string
  color: string | null
}

export interface CalendarEvent {
  id: string
  householdId: string
  title: string
  description: string
  location: string | null
  notes: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  createdBy: string
  updatedBy: string
  startsAt: string | null
  endsAt: string | null
  allDay: boolean
  allDayStart: string | null
  allDayEnd: string | null
  isFamilyEvent: boolean
  reminderType: ReminderType
  reminderOffsetMinutes: number | null
  externalSource: string | null
  externalId: string | null
  recurrenceSeriesId: string | null
  participants: CalendarEventParticipant[]
  createdAt: string
  updatedAt: string
}

export interface CalendarEventInput {
  id?: string
  title: string
  description: string
  location?: string
  notes?: string
  categoryId?: string | null
  startsAt?: string | null
  endsAt?: string | null
  allDay: boolean
  allDayStart?: string | null
  allDayEnd?: string | null
  isFamilyEvent: boolean
  reminderType: ReminderType
  reminderOffsetMinutes?: number | null
  externalSource?: string
  externalId?: string
  participantIds: string[]
  recurrence?: import('./calendar-recurrence').CalendarRecurrenceInput | null
}

export interface CalendarOccurrence {
  key: string
  event: CalendarEvent
  startsAt: string
  endsAt: string
  allDay: boolean
  occurrenceDate: string
  recurrence: import('./calendar-recurrence').CalendarRecurrenceRule | null
}

export type RecurringActionScope = 'series' | 'future'
