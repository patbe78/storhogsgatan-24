import type { CalendarRecurrenceRule } from '../types/calendar-recurrence'
import { generateOccurrences, occurrencesBefore } from '../utils/calendar-recurrence'
import { event } from './fixtures'

const rangeStart = new Date('2026-08-01T00:00:00Z')
const rangeEnd = new Date('2028-09-01T00:00:00Z')
function rule(overrides: Partial<CalendarRecurrenceRule> = {}): CalendarRecurrenceRule {
  return {
    id: 'series',
    frequency: 'daily',
    intervalValue: 1,
    startsOn: '2026-08-10',
    endsOn: null,
    occurrenceCount: 5,
    parentSeriesId: null,
    splitFromDate: null,
    ...overrides
  }
}
describe('calendar recurrence', () => {
  it('genererar dagligen', () =>
    expect(generateOccurrences(event(), rule(), rangeStart, rangeEnd)).toHaveLength(5))
  it('genererar veckovis', () => {
    const items = generateOccurrences(
      event(),
      rule({ frequency: 'weekly', occurrenceCount: 3 }),
      rangeStart,
      rangeEnd
    )
    expect(Date.parse(items[1].startsAt) - Date.parse(items[0].startsAt)).toBe(7 * 86400000)
  })
  it('genererar varannan vecka', () => {
    const items = generateOccurrences(
      event(),
      rule({ frequency: 'weekly', intervalValue: 2, occurrenceCount: 2 }),
      rangeStart,
      rangeEnd
    )
    expect(Date.parse(items[1].startsAt) - Date.parse(items[0].startsAt)).toBe(14 * 86400000)
  })
  it('bevarar lokal Stockholmstid över sommartidsbyte', () => {
    const items = generateOccurrences(
      event({ startsAt: '2026-03-22T17:00:00Z', endsAt: '2026-03-22T18:00:00Z' }),
      rule({ frequency: 'weekly', startsOn: '2026-03-22', occurrenceCount: 2 }),
      new Date('2026-03-20T00:00:00Z'),
      new Date('2026-04-02T00:00:00Z')
    )
    expect(items.map((item) => item.startsAt)).toEqual([
      '2026-03-22T17:00:00.000Z',
      '2026-03-29T16:00:00.000Z'
    ])
  })
  it('genererar månadsvis', () =>
    expect(
      generateOccurrences(
        event(),
        rule({ frequency: 'monthly', occurrenceCount: 4 }),
        rangeStart,
        rangeEnd
      ).map((item) => item.occurrenceDate)
    ).toEqual(['2026-08-10', '2026-09-10', '2026-10-10', '2026-11-10']))
  it('matchar sekventiell month-end-clamping i backendkontraktet', () =>
    expect(
      generateOccurrences(
        event({
          startsAt: '2026-01-31T08:00:00.000Z',
          endsAt: '2026-01-31T09:00:00.000Z'
        }),
        rule({ frequency: 'monthly', startsOn: '2026-01-31', occurrenceCount: 3 }),
        new Date('2026-01-01T00:00:00Z'),
        new Date('2026-04-01T00:00:00Z')
      ).map((item) => item.occurrenceDate)
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-28']))
  it('bevarar Stockholmstid även över återgången till CET', () => {
    const items = generateOccurrences(
      event({ startsAt: '2026-10-18T06:00:00Z', endsAt: '2026-10-18T07:00:00Z' }),
      rule({ frequency: 'weekly', startsOn: '2026-10-18', occurrenceCount: 2 }),
      new Date('2026-10-17T00:00:00Z'),
      new Date('2026-10-27T00:00:00Z')
    )
    expect(items.map((item) => item.startsAt)).toEqual([
      '2026-10-18T06:00:00.000Z',
      '2026-10-25T07:00:00.000Z'
    ])
  })
  it('genererar årsvis', () =>
    expect(
      generateOccurrences(
        event(),
        rule({ frequency: 'yearly', occurrenceCount: 3 }),
        rangeStart,
        rangeEnd
      )
    ).toHaveLength(3))
  it('stöder eget intervall', () => {
    const items = generateOccurrences(
      event(),
      rule({ intervalValue: 3, occurrenceCount: 3 }),
      rangeStart,
      rangeEnd
    )
    expect(items.map((item) => item.occurrenceDate)).toEqual([
      '2026-08-10',
      '2026-08-13',
      '2026-08-16'
    ])
  })
  it('respekterar slutdatum', () =>
    expect(
      generateOccurrences(
        event(),
        rule({ occurrenceCount: null, endsOn: '2026-08-12' }),
        rangeStart,
        rangeEnd
      )
    ).toHaveLength(3))
  it('räknar tidigare förekomster inför delning', () =>
    expect(
      occurrencesBefore(
        rule({ frequency: 'weekly', occurrenceCount: null }),
        new Date('2026-08-10T16:00:00Z'),
        '2026-08-31'
      )
    ).toBe(3))
})
