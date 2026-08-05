import { allDayBounds, calendarRange, stockholmLocalToIso } from '../utils/calendar-dates'

describe('calendar dates', () => {
  it('konverterar svensk sommartid till UTC', () =>
    expect(stockholmLocalToIso('2026-08-10', '18:00')).toBe('2026-08-10T16:00:00.000Z'))
  it('gör inkluderande heldagsslut exklusivt', () => {
    const bounds = allDayBounds('2026-08-10', '2026-08-14')
    expect(bounds.start).toBe('2026-08-09T22:00:00.000Z')
    expect(bounds.end).toBe('2026-08-14T22:00:00.000Z')
  })
  it('börjar veckan på måndag', () =>
    expect(calendarRange('week', new Date('2026-08-12T12:00:00')).start.getDay()).toBe(1))
})
