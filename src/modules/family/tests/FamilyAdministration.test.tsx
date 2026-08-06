import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FamilyAdministration } from '../components/FamilyAdministration'
import { getCurrentProfile } from '@/shared/services/profile'
import {
  listFamilyAudit,
  listFamilyInvitations,
  listFamilyMembers
} from '../services/family.service'
import { felix, patrik } from '@/modules/calendar/tests/fixtures'

vi.mock('@/shared/services/profile', () => ({ getCurrentProfile: vi.fn() }))
vi.mock('../services/family.service', () => ({
  listFamilyAudit: vi.fn(),
  listFamilyInvitations: vi.fn(),
  listFamilyMembers: vi.fn(),
  revokeFamilyInvitation: vi.fn(),
  setFamilyMemberActive: vi.fn(),
  updateFamilyMemberColor: vi.fn(),
  updateFamilyMemberRole: vi.fn()
}))

describe('FamilyAdministration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listFamilyMembers).mockResolvedValue([])
    vi.mocked(listFamilyInvitations).mockResolvedValue([])
    vi.mocked(listFamilyAudit).mockResolvedValue([])
  })

  it('visas för aktiv admin', async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(patrik)
    render(<FamilyAdministration />)
    expect(await screen.findByRole('heading', { name: 'Familjemedlemmar' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bjud in familjemedlem' })).toBeInTheDocument()
  })

  it.each(['adult', 'member', 'guest'] as const)('döljs för rollen %s', async (role) => {
    vi.mocked(getCurrentProfile).mockResolvedValue({ ...felix, role })
    const { container } = render(<FamilyAdministration />)
    await vi.waitFor(() => expect(getCurrentProfile).toHaveBeenCalled())
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(listFamilyMembers).not.toHaveBeenCalled()
  })
})
