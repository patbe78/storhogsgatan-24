import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { DashboardPage } from './index'

const setOffset = vi.fn()

vi.mock('./hooks/use-current-profile', () => ({
  useCurrentProfile: () => ({
    id: 'profile-1',
    name: 'Patrik',
    role: 'admin',
    color: '#2563eb',
    is_active: true
  })
}))
vi.mock('./hooks/use-dashboard-view-model', () => ({
  useDashboardViewModel: () => ({
    date: { label: 'Tisdag 11 Augusti', weekNumber: 33 },
    upcoming: [],
    myWork: { offset: 0, weekNumber: 33, items: [], setOffset },
    familyWork: { offset: 0, weekNumber: 33, items: [], setOffset },
    household: { offset: 0, weekNumber: 33, items: [], setOffset },
    isLoading: false,
    isError: false
  })
}))

describe('DashboardPage', () => {
  it('renderar exakt de fem dashboardsektionerna i rätt ordning', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )

    expect(screen.getByRole('heading', { name: 'Välkommen Patrik' })).toBeInTheDocument()
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.dashboard-widget'))
    expect(
      sections.map((section) => section.getAttribute('aria-label') ?? section.textContent)
    ).toEqual([
      'Datum och veckonummer',
      expect.stringContaining('Mina kommande aktiviteter'),
      expect.stringContaining('Våra arbetstider · V33'),
      expect.stringContaining('Familjens arbetstider · V33'),
      expect.stringContaining('Hushållsuppgifter · V33')
    ])
    expect(screen.getByText('Tisdag 11 Augusti')).toBeInTheDocument()
    expect(screen.getByText('V33', { selector: '.dashboard-week' })).toBeInTheDocument()
    expect(screen.queryByText('Vecka 33')).not.toBeInTheDocument()
  })

  it('har tagit bort de gamla dashboardkorten och snabbgenvägarna', () => {
    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    )
    expect(screen.queryByRole('heading', { name: 'Idag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Veckonummer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Familjen idag' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Snabbgenvägar' })).not.toBeInTheDocument()
    expect(screen.queryByText('Familjeöversikt kommer snart.')).not.toBeInTheDocument()
  })
})
