import { supabase } from '@/shared/services/supabase'
import type { CalendarEventInput } from '../types/calendar-event'

export async function splitCalendarSeries(
  eventId: string,
  occurrenceDate: string,
  priorOccurrences: number,
  changes: CalendarEventInput
): Promise<string> {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  const { data, error } = await supabase.rpc('calendar_split_series', {
    p_event_id: eventId,
    p_occurrence_date: occurrenceDate,
    p_prior_occurrences: priorOccurrences,
    p_payload: changes
  })
  if (error) throw error
  return String(data)
}
