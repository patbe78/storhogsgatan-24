import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { singleOccurrence } from '@/modules/calendar/utils/calendar-recurrence'
import { event, patrik } from '@/modules/calendar/tests/fixtures'
import { EventsWidget } from './components/widgets'
import type { DashboardOccurrenceItem } from './types/dashboard'

function items(count: number): DashboardOccurrenceItem[] {
  return Array.from({ length: count }, (_, index) => ({
    occurrence: singleOccurrence(
      event({
        id: `event-${index}`,
        title: `Aktivitet ${index + 1}`,
        startsAt: `2026-08-${String(11 + index).padStart(2, '0')}T16:00:00.000Z`,
        endsAt: `2026-08-${String(11 + index).padStart(2, '0')}T17:00:00.000Z`
      })
    ),
    owners: [patrik]
  }))
}

describe('EventsWidget', () => {
  it('visar högst sex redan selekterade kommande aktiviteter', () => {
    render(
      <BrowserRouter>
        <EventsWidget items={items(6)} isLoading={false} isError={false} />
      </BrowserRouter>
    )
    expect(screen.getAllByRole('link', { name: /Aktivitet/ })).toHaveLength(6)
  })

  it('renderar tydligt tomläge', () => {
    render(
      <BrowserRouter>
        <EventsWidget items={[]} isLoading={false} isError={false} />
      </BrowserRouter>
    )
    expect(
      screen.getByText('Inga kommande aktiviteter de närmaste 14 dagarna.')
    ).toBeInTheDocument()
  })

  it('visar heldagsaktivitetens titel och datum utan etiketten Heldag', () => {
    const allDayItem: DashboardOccurrenceItem = {
      occurrence: singleOccurrence(
        event({
          id: 'all-day',
          title: 'Karlstad',
          allDay: true,
          startsAt: null,
          endsAt: null,
          allDayStart: '2026-08-12',
          allDayEnd: '2026-08-12'
        })
      ),
      owners: [patrik]
    }

    render(
      <BrowserRouter>
        <EventsWidget items={[allDayItem]} isLoading={false} isError={false} />
      </BrowserRouter>
    )

    expect(screen.getByText('Onsdag 12 aug.')).toBeInTheDocument()
    expect(screen.getByText('Karlstad')).toBeInTheDocument()
    expect(screen.queryByText('Heldag')).not.toBeInTheDocument()
  })
})
