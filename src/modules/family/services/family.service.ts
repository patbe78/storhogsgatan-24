import { supabase } from '@/shared/services/supabase'
import type { FamilyAuditEntry, FamilyInvitation, FamilyMember, FamilyRole } from '../types/family'

function client() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

export async function listFamilyMembers(): Promise<FamilyMember[]> {
  const { data, error } = await client().rpc('family_list_members')
  if (error) throw error
  return (data ?? []) as FamilyMember[]
}

export async function listFamilyInvitations(): Promise<FamilyInvitation[]> {
  const { data, error } = await client().rpc('family_list_invitations')
  if (error) throw error
  return (data ?? []) as FamilyInvitation[]
}

export async function listFamilyAudit(): Promise<FamilyAuditEntry[]> {
  const { data, error } = await client().rpc('family_list_audit_log', {
    p_limit: 100,
    p_before: null
  })
  if (error) throw error
  return (data ?? []) as FamilyAuditEntry[]
}

export async function revokeFamilyInvitation(id: string): Promise<void> {
  const { error } = await client().rpc('family_revoke_invitation', { p_invitation_id: id })
  if (error) throw error
}

export async function updateFamilyMemberRole(id: string, role: FamilyRole): Promise<void> {
  const { error } = await client().rpc('family_update_member_role', {
    p_profile_id: id,
    p_role: role
  })
  if (error) throw error
}

export async function updateFamilyMemberColor(id: string, color: string): Promise<void> {
  const { error } = await client().rpc('family_update_member_color', {
    p_profile_id: id,
    p_color: color
  })
  if (error) throw error
}

export async function setFamilyMemberActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await client().rpc('family_set_member_active', {
    p_profile_id: id,
    p_is_active: isActive
  })
  if (error) throw error
}
