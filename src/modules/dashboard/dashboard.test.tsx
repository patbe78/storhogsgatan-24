import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { DashboardPage } from './index'

vi.mock('@/shared/services/profile', () => ({
  getCurrentProfile: vi.fn()
}))
vi.mock('@/modules/calendar', () => ({
  useUpcomingCalendarEvents: () => ({ data: [], isLoading: false, isError: false })
}))

import { getCurrentProfile } from '@/shared/services/profile'

const mockedGetCurrentProfile = vi.mocked(getCurrentProfile)

describe('DashboardPage', () => {
  afterEach(() => {
    mockedGetCurrentProfile.mockReset()
  })

  it('visar dashboardens grundwidgetar', () => {
    mockedGetCurrentProfile.mockResolvedValue(null)

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )
    expect(screen.getByRole('heading', { name: 'Välkommen' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Idag' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Veckonummer' })).toBeInTheDocument()
  })

  it('visar profilens namn i välkomsthälsningen', async () => {
    mockedGetCurrentProfile.mockResolvedValue({
      id: '123',
      name: 'Patrik',
      email: 'patrik@example.com',
      role: 'member',
      avatar_url: null,
      color: null,
      household_id: '24000000-0000-4000-8000-000000000024',
      created_at: '2026-08-03T00:00:00.000Z',
      updated_at: '2026-08-03T00:00:00.000Z'
    })

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Välkommen Patrik' })).toBeInTheDocument()
    })
  })
})
