import { describe, expect, it } from 'vitest'
import { familyErrorMessage, formatAuditEntry } from '../utils/family-formatters'
import type { FamilyAuditEntry } from '../types/family'

describe('family formatters', () => {
  it('visar sista-admin-felet på svenska', () => {
    expect(familyErrorMessage(new Error('FAMILY_LAST_ADMIN'))).toBe(
      'Hushållet måste ha minst en aktiv administratör.'
    )
  })

  it('formaterar audit utan känslig metadata', () => {
    const entry = {
      action: 'member_reactivated',
      actor_name: 'Patrik',
      target_name: 'Felix'
    } as FamilyAuditEntry
    expect(formatAuditEntry(entry)).toBe('Patrik återaktiverade Felix')
  })
})
