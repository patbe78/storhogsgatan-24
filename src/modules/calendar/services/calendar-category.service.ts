import { supabase } from '@/shared/services/supabase'
import type { CalendarCategory, CalendarCategoryInput } from '../types/calendar-category'

function client() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

export async function getCalendarCategories(includeArchived = true): Promise<CalendarCategory[]> {
  let query = client()
    .from('calendar_categories')
    .select('id,household_id,name,icon,color,is_archived,is_system')
    .order('name')
  if (!includeArchived) query = query.eq('is_archived', false)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isArchived: row.is_archived,
    isSystem: row.is_system
  }))
}

export async function saveCalendarCategory(input: CalendarCategoryInput): Promise<string> {
  const { data, error } = await client().rpc('calendar_save_category', {
    p_category_id: input.id ?? null,
    p_name: input.name,
    p_icon: input.icon ?? null,
    p_color: input.color ?? null,
    p_is_archived: input.isArchived ?? false
  })
  if (error) throw error
  return String(data)
}
