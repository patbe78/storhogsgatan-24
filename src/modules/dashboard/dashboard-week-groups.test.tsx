import { render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import type { CalendarOccurrence } from '@/modules/calendar/types/calendar-event'
import { event, felix } from '@/modules/calendar/tests/fixtures'
import { singleOccurrence } from '@/modules/calendar/utils/calendar-recurrence'
import { WeeklyActivitiesWidget } from './components/widgets'
import type { DashboardOccurrenceItem } from './types/dashboard'
import { dashboardWeekRange } from './utils/dashboard-dates'
import { groupDashboardWeekActivities } from './utils/dashboard-week-groups'

const now = new Date('2026-08-11T10:00:00.000Z')
const range = dashboardWeekRange(now, 0)

function item(occurrence: CalendarOccurrence): DashboardOccurrenceItem {
  return { occurrence, owners: [{ ...felix, role: 'member', is_active: true }] }
}

function timed(
  id: string,
  title: string,
  startsAt: string,
  endsAt: string
): DashboardOccurrenceItem {
  return item(singleOccurrence(event({ id, title, startsAt, endsAt })))
}

function allDay(
  id: string,
  title: string,
  allDayStart: string,
  allDayEnd: string
): DashboardOccurrenceItem {
  return item(
    singleOccurrence(
      event({
        id,
        title,
        allDay: true,
        startsAt: null,
        endsAt: null,
        allDayStart,
        allDayEnd
      })
    )
  )
}

describe('dashboardens kompakta veckogrupper', () => {
  it('grupperar kronologiskt och visar dagrubriken en gång utan datum', () => {
    const groups = groupDashboardWeekActivities(
      [
        timed('late', 'Jobb', '2026-08-10T11:30:00.000Z', '2026-08-10T19:30:00.000Z'),
        timed('early', 'Jobb', '2026-08-10T03:30:00.000Z', '2026-08-10T11:30:00.000Z'),
        timed('tuesday', 'Jobb', '2026-08-11T04:00:00.000Z', '2026-08-11T13:00:00.000Z')
      ],
      range
    )

    expect(groups.map((group) => group.label)).toEqual(['Mån', 'Tis'])
    expect(groups[0].items.map(({ occurrence }) => occurrence.event.id)).toEqual(['early', 'late'])
  })

  it('visar en flerdagarsaktivitet en gång under ett kompakt dagintervall', () => {
    const groups = groupDashboardWeekActivities(
      [allDay('leave', 'Sjukskriven', '2026-08-10', '2026-08-14')],
      range
    )

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Mån–Fre')
  })

  it('grupperar ett tidsatt nattpass enbart på startdagen men behåller sluttiden', () => {
    const overnight = timed(
      'night',
      'Nattjour',
      '2026-08-14T19:30:00.000Z',
      '2026-08-15T03:30:00.000Z'
    )
    const groups = groupDashboardWeekActivities([overnight], range)

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('Fre')
    expect(groups[0].label).not.toBe('Fre–Lör')
  })

  it('renderar kompakta rader, döljer Jobb och behåller titel, heldag, namn och profilfärg', () => {
    const setOffset = vi.fn()
    render(
      <BrowserRouter>
        <WeeklyActivitiesWidget
          cardName="Familjens arbetstider"
          weekNumber={33}
          range={range}
          offset={0}
          setOffset={setOffset}
          items={[
            timed('work', 'Jobb', '2026-08-10T03:30:00.000Z', '2026-08-10T11:30:00.000Z'),
            timed('night', 'Nattjour', '2026-08-11T19:00:00.000Z', '2026-08-12T05:00:00.000Z'),
            allDay('leave', 'Sjukskriven', '2026-08-13', '2026-08-13')
          ]}
          empty="Inga arbetstider denna vecka."
          showOwners
          activityType="work"
          isLoading={false}
          isError={false}
        />
      </BrowserRouter>
    )

    const card = screen
      .getByRole('heading', {
        name: 'Familjens arbetstider · V33'
      })
      .closest('section')!
    expect(
      within(card)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent)
    ).toEqual(['Mån', 'Tis', 'Tor'])
    expect(within(card).queryByText('Jobb')).not.toBeInTheDocument()
    expect(within(card).getByText('05:30–13:30')).toBeInTheDocument()
    expect(within(card).getByText('Nattjour · 21:00–07:00')).toBeInTheDocument()
    expect(within(card).getByText('Sjukskriven · Heldag')).toBeInTheDocument()
    expect(within(card).getAllByText('Felix')).toHaveLength(3)
    expect(card.querySelectorAll('.dashboard-week-owner__color')).toHaveLength(3)
    expect(card.querySelector('.dashboard-owner')).not.toBeInTheDocument()
    expect(card.querySelector('.dashboard-events')).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent('Måndag 10 aug')
    expect(within(card).queryByText('Denna vecka')).not.toBeInTheDocument()
    expect(within(card).queryByText('Nästa vecka')).not.toBeInTheDocument()
    expect(
      within(card).getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' })
    ).toBeDisabled()
  })

  it('visar bara dag och titel för Hushållsuppgifter', () => {
    render(
      <BrowserRouter>
        <WeeklyActivitiesWidget
          cardName="Hushållsuppgifter"
          weekNumber={33}
          range={range}
          offset={0}
          setOffset={vi.fn()}
          items={[
            timed(
              'waste',
              'Sophämtning tunna 1',
              '2026-08-13T04:00:00.000Z',
              '2026-08-13T15:00:00.000Z'
            )
          ]}
          empty="Inga hushållsuppgifter denna vecka."
          activityType="household"
          isLoading={false}
          isError={false}
        />
      </BrowserRouter>
    )

    const card = screen
      .getByRole('heading', { name: 'Hushållsuppgifter · V33' })
      .closest('section')!
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('Tor')
    expect(within(card).getByText('Sophämtning tunna 1')).toBeInTheDocument()
    expect(within(card).queryByText('06:00–17:00')).not.toBeInTheDocument()
    expect(within(card).queryByText('Heldag')).not.toBeInTheDocument()
  })
})
