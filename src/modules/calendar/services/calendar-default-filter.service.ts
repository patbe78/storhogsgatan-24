import { supabase } from '@/shared/services/supabase'
import type {
  CalendarDefaultFilter,
  CalendarFilterCell,
  CalendarFilterMatrixValue
} from '../types/calendar-filter'

interface CalendarDefaultFilterEntryRow {
  participant_profile_id: string
  category_id: string | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireClient().auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Du måste vara inloggad för att använda kalenderfilter.')
  return data.user.id
}

export async function getCalendarDefaultFilter(): Promise<CalendarDefaultFilter> {
  const client = requireClient()
  const userId = await currentUserId()
  const { data: filter, error: filterError } = await client
    .from('calendar_default_filters')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (filterError) throw filterError
  if (!filter) return { hasCustomDefault: false, selectedCells: [] }

  const { data, error } = await client
    .from('calendar_default_filter_entries')
    .select('participant_profile_id, category_id')
    .eq('filter_user_id', userId)
  if (error) throw error

  const selectedCells: CalendarFilterCell[] = ((data ?? []) as CalendarDefaultFilterEntryRow[]).map(
    (row) => ({
      participantProfileId: row.participant_profile_id,
      category: row.category_id
        ? { kind: 'category', categoryId: row.category_id }
        : { kind: 'uncategorized' }
    })
  )
  return { hasCustomDefault: true, selectedCells }
}

export async function saveCalendarDefaultFilter(value: CalendarFilterMatrixValue): Promise<void> {
  const entries = value.selectedCells.map((cell) => ({
    participant_profile_id: cell.participantProfileId,
    category_id: cell.category.kind === 'category' ? cell.category.categoryId : null
  }))
  const { error } = await requireClient().rpc('calendar_replace_default_filter', {
    p_entries: entries
  })
  if (error) throw error
}
