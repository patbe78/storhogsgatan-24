import { createCalendarViewModel } from '../adapters/calendar-view.adapter'
import { createCalendarMonthWeeks, isoWeekNumber } from '../utils/calendar-month'
import { parseDateKey } from '../utils/calendar-dates'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event } from './fixtures'

function allDay(id: string, start: string, end: string) {
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

function augustWeeks(...occurrences: ReturnType<typeof allDay>[]) {
  const model = createCalendarViewModel('month', parseDateKey('2026-08-10'), occurrences)
  return createCalendarMonthWeeks(model)
}

describe('ISO-veckonummer', () => {
  it.each([
    ['mitt i året', '2026-08-10', 33],
    ['vecka 1', '2026-01-01', 1],
    ['årsskifte till nästa ISO-år', '2024-12-30', 1],
    ['år med vecka 53', '2021-01-01', 53]
  ])('%s: %s är vecka %i', (_label, date, expected) => {
    expect(isoWeekNumber(parseDateKey(date))).toBe(expected)
  })
})

describe('heldagssegment i månadsvyn', () => {
  it('skapar ett segment för en heldagsaktivitet på en dag', () => {
    const week = augustWeeks(allDay('en-dag', '2026-08-03', '2026-08-03'))[1]
    expect(week.segments[0]).toMatchObject({ startColumn: 1, span: 1, lane: 0 })
  })

  it('spänner sammanhängande över en hel vecka', () => {
    const week = augustWeeks(allDay('hel-vecka', '2026-08-03', '2026-08-09'))[1]
    expect(week.segments[0]).toMatchObject({
      startColumn: 1,
      span: 7,
      isStart: true,
      isEnd: true
    })
  })

  it('delar torsdag till tisdag korrekt vid veckogränsen', () => {
    const weeks = augustWeeks(allDay('veckogräns', '2026-08-06', '2026-08-11'))
    expect(weeks[1].segments[0]).toMatchObject({
      startColumn: 4,
      span: 4,
      isStart: true,
      isEnd: false
    })
    expect(weeks[2].segments[0]).toMatchObject({
      startColumn: 1,
      span: 2,
      isStart: false,
      isEnd: true
    })
  })

  it('skapar start-, mellan- och slutsegment över flera veckor', () => {
    const weeks = augustWeeks(allDay('flera-veckor', '2026-08-01', '2026-08-20'))
    const segments = weeks.flatMap((week) => week.segments)
    expect(segments).toHaveLength(4)
    expect(segments.map(({ isStart, isEnd }) => [isStart, isEnd])).toEqual([
      [true, false],
      [false, false],
      [false, false],
      [false, true]
    ])
  })

  it('placerar samtidiga segment i separata lanes deterministiskt', () => {
    const weeks = augustWeeks(
      allDay('första', '2026-08-03', '2026-08-08'),
      allDay('andra', '2026-08-05', '2026-08-09')
    )
    expect(weeks[1].laneCount).toBe(2)
    expect(weeks[1].segments.map((segment) => segment.lane)).toEqual([0, 1])
  })

  it('återanvänder lane för fortsättningssegment när den är ledig', () => {
    const weeks = augustWeeks(
      allDay('lång', '2026-08-06', '2026-08-18'),
      allDay('kort', '2026-08-03', '2026-08-05')
    )
    const lanes = weeks
      .flatMap((week) => week.segments)
      .filter((segment) => segment.item.eventId === 'lång')
      .map((segment) => segment.lane)
    expect(new Set(lanes)).toEqual(new Set([0]))
  })
})
