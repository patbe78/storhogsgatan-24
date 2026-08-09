import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { createCalendarViewModel } from '../adapters/calendar-view.adapter'
import { CalendarMonthView } from '../components/CalendarMonthView'
import type { CalendarOccurrence } from '../types/calendar-event'
import { parseDateKey, toDateKey } from '../utils/calendar-dates'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event } from './fixtures'

function timed(id: string, title = id): CalendarOccurrence {
  return singleOccurrence(
    event({
      id,
      title,
      startsAt: '2026-08-10T10:00:00.000Z',
      endsAt: '2026-08-10T11:00:00.000Z'
    })
  )
}

function allDay(id: string, start: string, end = start): CalendarOccurrence {
  return singleOccurrence(
    event({
      id,
      title: id,
      startsAt: null,
      endsAt: null,
      allDay: true,
      allDayStart: start,
      allDayEnd: end
    })
  )
}

function renderMonth(occurrences: CalendarOccurrence[] = [], selectedDate?: string) {
  const model = createCalendarViewModel('month', parseDateKey('2026-08-10'), occurrences)
  return render(
    <CalendarMonthView
      model={model}
      selectedDate={selectedDate}
      onSelect={vi.fn()}
      onCreate={vi.fn()}
    />
  )
}

describe('CalendarMonthView', () => {
  it('visar tom månad med egen månadsrubrik och alla sju dagar', () => {
    renderMonth()
    expect(screen.getByRole('heading', { name: 'Augusti 2026' })).toBeVisible()
    expect(screen.getByLabelText('Månadsvy Augusti 2026')).toBeVisible()
    expect(screen.getAllByRole('button', { name: /Skapa aktivitet/ })).toHaveLength(42)
  })

  it('visar ISO-veckonummer för varje synlig veckorad', () => {
    renderMonth()
    expect(screen.getByLabelText('Vecka 31')).toHaveTextContent('v31')
    expect(screen.getByLabelText('Vecka 36')).toHaveTextContent('v36')
  })

  it('visar en vanlig aktivitet kompakt i rätt dag', () => {
    renderMonth([timed('vanlig', 'Tandläkare')])
    const card = screen.getByRole('button', { name: /Tandläkare/ })
    expect(card).toHaveClass('compact')
    expect(card.closest('.month-day')).toHaveAttribute('aria-label', '2026-08-10')
  })

  it('visar flera vanliga aktiviteter samma dag och räknar overflow', () => {
    renderMonth([timed('ett'), timed('två'), timed('tre'), timed('fyra')])
    expect(screen.getByText('+1 fler')).toBeVisible()
  })

  it('behåller en lång aktivitetstitel i ett trunkerbart kompakt kort', () => {
    const title = 'En mycket lång aktivitetstitel som måste trunkeras på en smal iPhone'
    renderMonth([timed('lång-titel', title)])
    expect(screen.getByRole('button', { name: new RegExp(title) })).toHaveClass('compact')
  })

  it('renderar en heldag och en flerdagarsaktivitet som spännande segment', () => {
    renderMonth([allDay('En dag', '2026-08-04'), allDay('Tre dagar', '2026-08-05', '2026-08-07')])
    const oneDay = screen.getByRole('button', { name: /En dag.*Heldagsaktivitet/ })
    const threeDays = screen.getByRole('button', { name: /Tre dagar.*Heldagsaktivitet/ })
    expect(oneDay).toHaveClass('starts', 'ends')
    expect(oneDay.style.gridColumn).toBe('2 / span 1')
    expect(threeDays.style.gridColumn).toBe('3 / span 3')
  })

  it('renderar klickbara fortsättningssegment över veckogränser och flera veckor', () => {
    renderMonth([allDay('Sommarresa', '2026-08-06', '2026-08-20')])
    const segments = screen.getAllByRole('button', { name: /Sommarresa.*Heldagsaktivitet/ })
    expect(segments).toHaveLength(3)
    expect(segments[0]).toHaveClass('continues-after')
    expect(segments[1]).toHaveClass('continues-before', 'continues-after')
    expect(segments[2]).toHaveClass('continues-before', 'ends')
  })

  it('staplar två samtidiga flerdagarsaktiviteter i olika rader', () => {
    renderMonth([
      allDay('Resa A', '2026-08-03', '2026-08-09'),
      allDay('Resa B', '2026-08-05', '2026-08-11')
    ])
    const first = screen.getByRole('button', { name: /Resa A.*Heldagsaktivitet/ })
    const second = screen.getAllByRole('button', { name: /Resa B.*Heldagsaktivitet/ })[0]
    expect(first.style.gridRow).not.toBe(second.style.gridRow)
  })

  it('skiljer dagens datum från vald dag, även när de är samma', () => {
    const today = toDateKey(new Date())
    const model = createCalendarViewModel('month', new Date(), [])
    const { container } = render(
      <CalendarMonthView model={model} selectedDate={today} onSelect={vi.fn()} onCreate={vi.fn()} />
    )
    const day = container.querySelector(`[aria-label="${today}"].month-day`)
    expect(day).toHaveClass('today', 'selected')
    expect(day).toHaveAttribute('aria-current', 'date')
  })

  it('uppdaterar rubrik och veckor vid månads- och årsskifte', () => {
    const model = createCalendarViewModel('month', parseDateKey('2027-01-05'), [])
    render(<CalendarMonthView model={model} onSelect={vi.fn()} onCreate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Januari 2027' })).toBeVisible()
    expect(screen.getByLabelText('Vecka 53')).toBeVisible()
    expect(screen.getByLabelText('Vecka 1')).toBeVisible()
  })

  it('renderar endast aktiviteter som finns kvar efter filtrering', () => {
    renderMonth([timed('visas', 'Visas efter filter')])
    expect(screen.getByRole('button', { name: /Visas efter filter/ })).toBeVisible()
    expect(screen.queryByText('Bortfiltrerad')).not.toBeInTheDocument()
  })
})
