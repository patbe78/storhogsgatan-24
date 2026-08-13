const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/shared/services/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import { getDashboardProfiles } from './services/dashboard-profile.service'

describe('dashboard profile service', () => {
  it('hämtar endast den smala household-scopade profil-RPC:n', async () => {
    const profiles = [
      { id: 'profile-1', name: 'Felix', role: 'member', color: '#16a34a', is_active: true }
    ]
    mocks.rpc.mockResolvedValueOnce({ data: profiles, error: null })

    await expect(getDashboardProfiles()).resolves.toEqual(profiles)
    expect(mocks.rpc).toHaveBeenCalledWith('dashboard_list_active_profiles')
  })

  it('vidarebefordrar RPC-fel', async () => {
    const error = new Error('DASHBOARD_FORBIDDEN')
    mocks.rpc.mockResolvedValueOnce({ data: null, error })
    await expect(getDashboardProfiles()).rejects.toBe(error)
  })
})
