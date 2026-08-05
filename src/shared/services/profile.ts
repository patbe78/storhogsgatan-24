import { supabase } from './supabase'
import type { Profile } from '@/shared/types/profile'

export type ProfileUpdate = Pick<Profile, 'id'> &
  Partial<Pick<Profile, 'name' | 'email' | 'avatar_url' | 'color'>>

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!supabase) return null

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return null

  return getProfile(userData.user.id)
}

export async function getProfile(id: string): Promise<Profile | null> {
  if (!supabase) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw error

  return data as Profile | null
}

export async function updateProfile(profile: ProfileUpdate): Promise<Profile> {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')

  const { id, ...changes } = profile
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error

  return data as Profile
}
