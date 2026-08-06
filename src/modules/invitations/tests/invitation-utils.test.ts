import { describe, expect, it } from 'vitest'
import { invitationSchema, tokenFromLocation } from '../utils/invitation-validation'
import { isRevocableInvitation } from '../utils/invitation-status'
import type { FamilyInvitation } from '@/modules/family/types/family'

describe('invitation utilities', () => {
  it('normaliserar e-post och färg och accepterar rollerna adult/member', () => {
    const parsed = invitationSchema.parse({
      name: ' Åsa ',
      email: ' ASA@EXAMPLE.COM ',
      role: 'member',
      profileColor: '#aabbcc'
    })
    expect(parsed).toEqual({
      name: 'Åsa',
      email: 'asa@example.com',
      role: 'member',
      profileColor: '#AABBCC'
    })
    expect(invitationSchema.safeParse({ ...parsed, role: 'admin' }).success).toBe(false)
  })

  it('nekar felaktig e-post och färg', () => {
    expect(
      invitationSchema.safeParse({ name: 'A', email: 'fel', role: 'member', profileColor: '#fff' })
        .success
    ).toBe(false)
  })

  it('läser token från query eller hash', () => {
    expect(tokenFromLocation('?token=query-token', '')).toBe('query-token')
    expect(tokenFromLocation('', '#token=hash-token')).toBe('hash-token')
  })

  it('tillåter endast öppna inbjudningar att återkallas', () => {
    const invitation = { status: 'pending' } as FamilyInvitation
    expect(isRevocableInvitation(invitation)).toBe(true)
    expect(isRevocableInvitation({ ...invitation, status: 'expired' })).toBe(false)
  })
})
