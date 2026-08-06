import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MembershipGate } from '../components/MembershipGate'
import { getCurrentProfile } from '@/shared/services/profile'
import { patrik } from '@/modules/calendar/tests/fixtures'

vi.mock('@/shared/services/profile', () => ({ getCurrentProfile: vi.fn() }))

describe('MembershipGate', () => {
  beforeEach(() => vi.mocked(getCurrentProfile).mockReset())

  it('släpper igenom en aktiv medlem', async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(patrik)
    render(
      <MembershipGate>
        <p>Dashboard</p>
      </MembershipGate>
    )
    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  it('visar avaktiveringsmeddelandet och döljer appen', async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue({
      ...patrik,
      is_active: false,
      deactivated_at: '2026-08-06T00:00:00Z',
      deactivated_by: patrik.id
    })
    render(
      <MembershipGate>
        <p>Dashboard</p>
      </MembershipGate>
    )
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Ditt medlemskap i hushållet är avaktiverat.'
      )
    )
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })
})
