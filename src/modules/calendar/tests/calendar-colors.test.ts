import {
  FALLBACK_PROFILE_COLOR,
  FAMILY_COLOR,
  MULTI_PARTICIPANT_COLOR,
  getEventColor
} from '../utils/calendar-colors'

describe('calendar colors', () => {
  const one = [{ id: '1', name: 'Felix', color: '#16a34a' }]
  it('använder deltagarens färg för en person', () =>
    expect(getEventColor(one, false)).toBe('#16a34a'))
  it('använder familjefärg för hela familjen', () =>
    expect(getEventColor(one, true)).toBe(FAMILY_COLOR))
  it('använder neutral färg för flera', () =>
    expect(getEventColor([...one, { id: '2', name: 'Åsa', color: null }], false)).toBe(
      MULTI_PARTICIPANT_COLOR
    ))
  it('har reservfärg', () =>
    expect(getEventColor([{ ...one[0], color: null }], false)).toBe(FALLBACK_PROFILE_COLOR))
})
