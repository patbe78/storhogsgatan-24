import { formatInTimeZone } from 'date-fns-tz'
import { CALENDAR_TIME_ZONE } from '@/modules/calendar/utils/calendar-dates'
import {
  dashboardDateLabel,
  dashboardIsoWeek,
  dashboardTodayRange,
  dashboardWeekRange
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

  it('gör idag till och med idag + 14 inkluderande med exklusiv slutgräns', () => {
    const range = dashboardTodayRange(new Date('2026-08-11T22:30:00.000Z'))
    expect(formatInTimeZone(range.start, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-12 00:00'
    )
    expect(formatInTimeZone(range.end, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-27 00:00'
    )
  })
})
