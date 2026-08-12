import { supabase } from '@/shared/services/supabase'
import type { DashboardProfile } from '../types/dashboard'

export async function getDashboardProfiles(): Promise<DashboardProfile[]> {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,role,color,is_active')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return (data ?? []) as DashboardProfile[]
}
