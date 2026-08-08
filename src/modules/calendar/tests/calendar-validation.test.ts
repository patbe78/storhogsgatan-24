import { validateCalendarEvent } from '../utils/calendar-validation'
import type { CalendarEventInput } from '../types/calendar-event'

const valid: CalendarEventInput = {
  title: 'Möte',
  description: 'Planering',
  startsAt: '2026-08-10T08:00:00Z',
  endsAt: '2026-08-10T09:00:00Z',
  allDay: false,
  isFamilyEvent: false,
  reminderOffsetsMinutes: [],
  participantIds: ['1']
}
describe('calendar validation', () => {
  it('accepterar giltig aktivitet', () => expect(validateCalendarEvent(valid)).toEqual({}))
  it('kräver titel och deltagare men tillåter tom beskrivning', () => {
    const errors = validateCalendarEvent({
      ...valid,
      title: '',
      description: '',
      participantIds: []
    })
    expect(errors).toMatchObject({
      title: expect.any(String),
      participantIds: expect.any(String)
    })
    expect(errors).not.toHaveProperty('description')
  })
  it('nekar beskrivning över 2 000 tecken', () =>
    expect(validateCalendarEvent({ ...valid, description: 'x'.repeat(2001) })).toHaveProperty(
      'description'
    ))
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
  it('nekar dubbla och negativa påminnelser', () => {
    expect(validateCalendarEvent({ ...valid, reminderOffsetsMinutes: [5, 5] })).toHaveProperty(
      'reminderOffsetsMinutes'
    )
    expect(validateCalendarEvent({ ...valid, reminderOffsetsMinutes: [-1] })).toHaveProperty(
      'reminderOffsetsMinutes'
    )
    expect(
      validateCalendarEvent({ ...valid, reminderOffsetsMinutes: [0, 5, 15, 120, 2880] })
    ).not.toHaveProperty('reminderOffsetsMinutes')
  })
})
