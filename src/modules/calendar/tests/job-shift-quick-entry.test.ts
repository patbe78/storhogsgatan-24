import { formatInTimeZone } from 'date-fns-tz'
import type { CalendarCategory } from '../types/calendar-category'
import { CALENDAR_TIME_ZONE } from '../utils/calendar-dates'
import {
  endTimeForJobShiftPreset,
  findWorkCategory,
  jobShiftTiming,
  matchingJobShiftPreset
} from '../utils/job-shift-quick-entry'

const workCategory: CalendarCategory = {
  id: 'work-id',
  householdId: 'household-id',
  name: 'Arbete',
  icon: 'briefcase',
  color: '#2563eb',
  isArchived: false,
  isSystem: true
}

describe('job shift quick entry helpers', () => {
  it('identifierar endast den aktiva systemkategorin Arbete', () => {
    expect(findWorkCategory([{ ...workCategory, isSystem: false }, workCategory])).toBe(
      workCategory
    )
    expect(findWorkCategory([{ ...workCategory, isArchived: true }])).toBeNull()
    expect(findWorkCategory([{ ...workCategory, name: 'Övrigt' }])).toBeNull()
  })

  it.each([
    [4, '10:00'],
    [6, '12:00'],
    [8, '14:00'],
    [9, '15:00'],
    [12, '18:00']
  ] as const)('räknar preset %i h från 06:00 till %s', (hours, expected) => {
    expect(endTimeForJobShiftPreset('2026-08-18', '06:00', hours)).toBe(expected)
  })

  it('tolkar sluttid före starttid som nästa kalenderdag', () => {
    const timing = jobShiftTiming('2026-08-21', '21:30', '05:30')
    expect(timing?.durationMinutes).toBe(480)
    expect(formatInTimeZone(timing!.endsAt, CALENDAR_TIME_ZONE, 'yyyy-MM-dd HH:mm')).toBe(
      '2026-08-22 05:30'
    )
  })

  it('matchar endast de fem tillåtna varaktigheterna', () => {
    expect(matchingJobShiftPreset(8 * 60)).toBe(8)
    expect(matchingJobShiftPreset(8 * 60 + 30)).toBeNull()
  })
})
