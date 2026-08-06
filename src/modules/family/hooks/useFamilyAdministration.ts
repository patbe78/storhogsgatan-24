import { useCallback, useEffect, useState } from 'react'
import { getCurrentProfile } from '@/shared/services/profile'
import {
  listFamilyAudit,
  listFamilyInvitations,
  listFamilyMembers,
  revokeFamilyInvitation,
  setFamilyMemberActive,
  updateFamilyMemberColor,
  updateFamilyMemberRole
} from '../services/family.service'
import type { FamilyAuditEntry, FamilyInvitation, FamilyMember, FamilyRole } from '../types/family'
import { familyErrorMessage } from '../utils/family-formatters'

export function useFamilyAdministration() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([])
  const [audit, setAudit] = useState<FamilyAuditEntry[]>([])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const profile = await getCurrentProfile()
      const isAdmin = Boolean(
        profile?.is_active && profile.role === 'admin' && profile.household_id
      )
      setAuthorized(isAdmin)
      if (!isAdmin) return
      const [nextMembers, nextInvitations, nextAudit] = await Promise.all([
        listFamilyMembers(),
        listFamilyInvitations(),
        listFamilyAudit()
      ])
      setMembers(nextMembers)
      setInvitations(nextInvitations)
      setAudit(nextAudit)
    } catch {
      setMessage('Familjeadministrationen kunde inte läsas in.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => void reload(), 0)
    return () => window.clearTimeout(timeout)
  }, [reload])

  const mutate = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setBusyId(id)
      setMessage('')
      try {
        await action()
        await reload()
      } catch (error) {
        setMessage(familyErrorMessage(error))
      } finally {
        setBusyId(null)
      }
    },
    [reload]
  )

  return {
    authorized,
    loading,
    busyId,
    message,
    members,
    invitations,
    audit,
    reload,
    revoke: (id: string) => mutate(id, () => revokeFamilyInvitation(id)),
    updateRole: (id: string, role: FamilyRole) =>
      mutate(id, () => updateFamilyMemberRole(id, role)),
    updateColor: (id: string, color: string) =>
      mutate(id, () => updateFamilyMemberColor(id, color)),
    setActive: (id: string, active: boolean) => mutate(id, () => setFamilyMemberActive(id, active))
  }
}
