import { validateCalendarEvent } from '../utils/calendar-validation'
import type { CalendarEventInput } from '../types/calendar-event'

const valid: CalendarEventInput = {
  title: 'Möte',
  description: 'Planering',
  startsAt: '2026-08-10T08:00:00Z',
  endsAt: '2026-08-10T09:00:00Z',
  allDay: false,
  isFamilyEvent: false,
  reminderType: 'none',
  participantIds: ['1']
}
describe('calendar validation', () => {
  it('accepterar giltig aktivitet', () => expect(validateCalendarEvent(valid)).toEqual({}))
  it('kräver titel, beskrivning och deltagare', () =>
    expect(
      validateCalendarEvent({ ...valid, title: '', description: '', participantIds: [] })
    ).toMatchObject({
      title: expect.any(String),
      description: expect.any(String),
      participantIds: expect.any(String)
    }))
  it('kräver slut efter start', () =>
    expect(validateCalendarEvent({ ...valid, endsAt: valid.startsAt })).toHaveProperty('endsAt'))
  it('kräver giltigt heldagsintervall', () =>
    expect(
      validateCalendarEvent({
        ...valid,
        allDay: true,
        startsAt: null,
        endsAt: null,
        allDayStart: '2026-08-14',
        allDayEnd: '2026-08-10'
      })
    ).toHaveProperty('allDayEnd'))
  it('nekar dubbla återkomstslut', () =>
    expect(
      validateCalendarEvent({
        ...valid,
        recurrence: {
          frequency: 'daily',
          intervalValue: 1,
          endsOn: '2026-09-01',
          occurrenceCount: 3
        }
      })
    ).toHaveProperty('recurrence'))
})
