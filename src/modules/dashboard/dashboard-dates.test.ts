import { formatInTimeZone } from 'date-fns-tz'
import { CALENDAR_TIME_ZONE } from '@/modules/calendar/utils/calendar-dates'
import { event } from '@/modules/calendar/tests/fixtures'
import { singleOccurrence } from '@/modules/calendar/utils/calendar-recurrence'
import {
  dashboardDateLabel,
  dashboardIsoWeek,
  dashboardTodayRange,
  dashboardWeekRange,
  dashboardWeekdayLabel,
  occurrenceBelongsToDashboardWeek
} from './utils/dashboard-dates'

describe('dashboard dates', () => {
  it('formaterar veckodag, datum och månad utan årtal', () => {
    const label = dashboardDateLabel(new Date('2026-08-11T10:00:00.000Z'))
    expect(label).toBe('Tisdag 11 Augusti')
    expect(label).not.toContain('2026')
  })

  it.each([
    ['normal vecka', '2026-08-11T10:00:00.000Z', 33],
    ['vecka 53 vid årsskifte', '2026-12-31T10:00:00.000Z', 53],
    ['vecka 1', '2027-01-04T10:00:00.000Z', 1],
    ['vecka 52', '2027-12-30T10:00:00.000Z', 52]
  ])('beräknar ISO-vecka: %s', (_name, value, expected) => {
    expect(dashboardIsoWeek(new Date(value))).toBe(expected)
  })

  it('definierar veckan måndag till nästa måndag över månads- och årsskifte', () => {
    const range = dashboardWeekRange(new Date('2026-12-31T10:00:00.000Z'), 0)
    expect(formatInTimeZone(range.start, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-12-28 00:00'
    )
    expect(formatInTimeZone(range.end, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2027-01-04 00:00'
    )
  })

  it('använder exakt svenska veckodagsförkortningar från måndag till söndag', () => {
    expect(
      Array.from({ length: 7 }, (_, index) =>
        dashboardWeekdayLabel(new Date(`2026-08-${String(10 + index).padStart(2, '0')}T10:00:00Z`))
      )
    ).toEqual(['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'])
  })

  it('gör idag till och med idag + 14 inkluderande med exklusiv slutgräns', () => {
    const range = dashboardTodayRange(new Date('2026-08-11T22:30:00.000Z'))
    expect(formatInTimeZone(range.start, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-12 00:00'
    )
    expect(formatInTimeZone(range.end, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-27 00:00'
    )
  })

  it('filtrerar tidsatta veckor på start >= måndag och start < nästa måndag', () => {
    const range = dashboardWeekRange(new Date('2026-08-11T10:00:00.000Z'), 0)
    const timed = (id: string, startsAt: string, endsAt: string) =>
      singleOccurrence(event({ id, startsAt, endsAt }))

    expect(
      occurrenceBelongsToDashboardWeek(
        timed('monday', '2026-08-09T22:00:00.000Z', '2026-08-09T23:00:00.000Z'),
        range
      )
    ).toBe(true)
    expect(
      occurrenceBelongsToDashboardWeek(
        timed('sunday', '2026-08-16T21:59:00.000Z', '2026-08-16T22:30:00.000Z'),
        range
      )
    ).toBe(true)
    expect(
      occurrenceBelongsToDashboardWeek(
        timed('next-monday', '2026-08-16T22:00:00.000Z', '2026-08-16T23:00:00.000Z'),
        range
      )
    ).toBe(false)
  })

  it('låter nattpass tillhöra startveckan men behåller överlapp för flerdagars heldag', () => {
    const current = dashboardWeekRange(new Date('2026-08-11T10:00:00.000Z'), 0)
    const next = dashboardWeekRange(new Date('2026-08-11T10:00:00.000Z'), 1)
    const overnight = singleOccurrence(
      event({
        startsAt: '2026-08-16T15:30:00.000Z',
        endsAt: '2026-08-17T03:30:00.000Z'
      })
    )
    const allDay = singleOccurrence(
      event({
        id: 'all-day',
        allDay: true,
        startsAt: null,
        endsAt: null,
        allDayStart: '2026-08-16',
        allDayEnd: '2026-08-17'
      })
    )

    expect(occurrenceBelongsToDashboardWeek(overnight, current)).toBe(true)
    expect(occurrenceBelongsToDashboardWeek(overnight, next)).toBe(false)
    expect(occurrenceBelongsToDashboardWeek(allDay, current)).toBe(true)
    expect(occurrenceBelongsToDashboardWeek(allDay, next)).toBe(true)
  })
})
