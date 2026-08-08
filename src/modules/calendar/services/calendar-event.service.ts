import { supabase } from '@/shared/services/supabase'
import type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventParticipant,
  RecurringActionScope
} from '../types/calendar-event'
import type { CalendarRecurrenceRule } from '../types/calendar-recurrence'

interface CalendarRpcRow extends Record<string, unknown> {
  id: string
  household_id: string
  title: string
  description: string
  location: string | null
  notes: string | null
  category_id: string | null
  category_name: string | null
  category_color: string | null
  created_by: string
  updated_by: string
  starts_at: string | null
  ends_at: string | null
  all_day: boolean
  all_day_start: string | null
  all_day_end: string | null
  is_family_event: boolean
  reminder_offsets_minutes?: number[]
  reminder_type?: string
  reminder_offset_minutes: number | null
  external_source: string | null
  external_id: string | null
  recurrence_series_id: string | null
  participants: Array<{ id: string; name: string; color: string | null }>
  recurrence: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CalendarEventWithRule {
  event: CalendarEvent
  recurrence: CalendarRecurrenceRule | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

function mapRow(row: CalendarRpcRow): CalendarEventWithRule {
  const event: CalendarEvent = {
    id: row.id,
    householdId: row.household_id,
    title: row.title,
    description: row.description,
    location: row.location,
    notes: row.notes,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    allDayStart: row.all_day_start,
    allDayEnd: row.all_day_end,
    isFamilyEvent: row.is_family_event,
    reminderOffsetsMinutes:
      row.reminder_offsets_minutes ??
      legacyReminderOffsets(row.reminder_type, row.reminder_offset_minutes),
    externalSource: row.external_source,
    externalId: row.external_id,
    recurrenceSeriesId: row.recurrence_series_id,
    participants: (row.participants ?? []) as CalendarEventParticipant[],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  const raw = row.recurrence
  const recurrence = raw
    ? {
        id: String(raw.id),
        frequency: raw.frequency as CalendarRecurrenceRule['frequency'],
        intervalValue: Number(raw.interval_value),
        startsOn: String(raw.starts_on),
        endsOn: raw.ends_on ? String(raw.ends_on) : null,
        occurrenceCount: raw.occurrence_count == null ? null : Number(raw.occurrence_count),
        parentSeriesId: raw.parent_series_id ? String(raw.parent_series_id) : null,
        splitFromDate: raw.split_from_date ? String(raw.split_from_date) : null
      }
    : null
  return { event, recurrence }
}

function legacyReminderOffsets(type?: string, custom?: number | null): number[] {
  const offsets: Record<string, number> = {
    at_start: 0,
    '5_minutes': 5,
    '15_minutes': 15,
    '30_minutes': 30,
    '1_hour': 60,
    '1_day': 1440
  }
  if (type === 'custom' && custom != null) return [custom]
  return type && offsets[type] != null ? [offsets[type]] : []
}

export async function getCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date
): Promise<CalendarEventWithRule[]> {
  const { data, error } = await requireClient().rpc('calendar_events_in_range', {
    p_range_start: rangeStart.toISOString(),
    p_range_end: rangeEnd.toISOString()
  })
  if (error) throw error
  return ((data ?? []) as CalendarRpcRow[]).map(mapRow)
}

export async function saveCalendarEvent(input: CalendarEventInput): Promise<string> {
  const { data, error } = await requireClient().rpc('calendar_save_event', {
    p_event_id: input.id ?? null,
    p_payload: input
  })
  if (error) throw error
  return String(data)
}

export async function deleteCalendarEvent(
  eventId: string,
  scope: RecurringActionScope = 'series',
  occurrenceDate?: string
): Promise<void> {
  const { error } = await requireClient().rpc('calendar_delete_event', {
    p_event_id: eventId,
    p_scope: scope,
    p_occurrence_date: occurrenceDate ?? null
  })
  if (error) throw error
}

export async function getCalendarProfiles(): Promise<CalendarEventParticipant[]> {
  const { data, error } = await requireClient().rpc('calendar_list_active_profiles')
  if (error) throw error
  return (data ?? []) as CalendarEventParticipant[]
}
