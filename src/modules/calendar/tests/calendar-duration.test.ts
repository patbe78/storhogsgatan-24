import { describe, expect, it } from 'vitest'
import {
  CALENDAR_DURATION_OPTIONS,
  durationMinutesBetween,
  endIsoFromDuration,
  formatDuration
} from '../utils/calendar-duration'

describe('calendar duration', () => {
  it('erbjuder samtliga presets', () => {
    expect(CALENDAR_DURATION_OPTIONS.map((option) => option.minutes)).toEqual([
      15, 30, 45, 60, 90, 120, 180
    ])
  })

  it('härleder duration och använder 1 timme som säker default', () => {
    expect(durationMinutesBetween('2026-08-10T09:00:00Z', '2026-08-10T10:30:00Z')).toBe(90)
    expect(durationMinutesBetween(null, null)).toBe(60)
    expect(durationMinutesBetween('2026-08-10T10:00:00Z', '2026-08-10T09:00:00Z')).toBe(60)
  })

  it('beräknar ett positivt slut över midnatt och blockerar noll', () => {
    expect(endIsoFromDuration('2026-08-10T23:30:00.000Z', 120)).toBe('2026-08-11T01:30:00.000Z')
    expect(endIsoFromDuration('2026-08-10T23:30:00.000Z', 0)).toBeNull()
    expect(formatDuration(197)).toBe('3 timmar 17 minuter')
  })
})
