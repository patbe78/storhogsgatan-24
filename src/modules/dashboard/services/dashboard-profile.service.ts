import { supabase } from '@/shared/services/supabase'
import type { DashboardProfile } from '../types/dashboard'

export async function getDashboardProfiles(): Promise<DashboardProfile[]> {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  const { data, error } = await supabase.rpc('dashboard_list_active_profiles')
  if (error) throw error
  return (data ?? []) as DashboardProfile[]
}
