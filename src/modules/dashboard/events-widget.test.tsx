import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { EventsWidget } from './components/widgets'

vi.mock('@/modules/calendar', () => ({
  useUpcomingCalendarEvents: () => ({
    isLoading: false,
    isError: false,
    data: Array.from({ length: 5 }, (_, index) => ({
      key: `event-${index}`,
      title: `Aktivitet ${index + 1}`,
      dateLabel: `${10 + index} aug.`,
      timeLabel: index === 0 ? 'Heldag' : '18:00–19:00',
      color: '#2563eb'
    }))
  })
}))

describe('EventsWidget', () => {
  it('visar fem kommande aktiviteter via kalenderns publika hook', () => {
    render(
      <BrowserRouter>
        <EventsWidget profileId="profile-1" />
      </BrowserRouter>
    )
    expect(screen.getAllByRole('link', { name: /Aktivitet/ })).toHaveLength(5)
    expect(screen.getByText(/Heldag/)).toBeInTheDocument()
  })
})
