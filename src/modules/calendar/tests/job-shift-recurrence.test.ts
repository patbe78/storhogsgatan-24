import {
  JOB_SHIFT_RECURRENCE_OPTIONS,
  jobShiftEndWeeks,
  jobShiftRecurrenceInput
} from '../utils/job-shift-recurrence'

describe('job shift recurrence choices', () => {
  it('exposes exactly the approved choices and weekly intervals', () => {
    expect(JOB_SHIFT_RECURRENCE_OPTIONS.map((option) => option.label)).toEqual([
      'Ingen återkommande',
      'Varje vardag (mån–fre)',
      'Varje vecka',
      'Varannan vecka',
      'Var tredje vecka',
      'Var fjärde vecka'
    ])
    const endWeek = { key: '2026-08-24', label: 'V35 2026', endsOn: '2026-08-30' }
    expect(jobShiftRecurrenceInput('weekly-1', endWeek)?.intervalValue).toBe(1)
    expect(jobShiftRecurrenceInput('weekly-2', endWeek)?.intervalValue).toBe(2)
    expect(jobShiftRecurrenceInput('weekly-3', endWeek)?.intervalValue).toBe(3)
    expect(jobShiftRecurrenceInput('weekly-4', endWeek)?.intervalValue).toBe(4)
  })

  it('uses ISO week/year labels but clips the final week to the start calendar year', () => {
    const weeks = jobShiftEndWeeks('2026-12-29')
    expect(weeks).toEqual([{ key: '2026-12-28', label: 'V53 2026', endsOn: '2026-12-31' }])
    expect(weeks.every((week) => week.endsOn <= '2026-12-31')).toBe(true)
  })

  it('can label a December date with the next ISO year without crossing the calendar boundary', () => {
    const weeks = jobShiftEndWeeks('2025-12-29')
    expect(weeks).toEqual([{ key: '2025-12-29', label: 'V1 2026', endsOn: '2025-12-31' }])
  })

  it('keeps ISO week boundaries identical in UTC, Stockholm and distant host timezones', () => {
    const originalTimezone = process.env.TZ
    try {
      const variants = ['UTC', 'Europe/Stockholm', 'America/Los_Angeles', 'Pacific/Kiritimati'].map(
        (timezone) => {
          process.env.TZ = timezone
          return jobShiftEndWeeks('2026-08-26').slice(0, 2)
        }
      )

      expect(variants).toEqual(
        Array.from({ length: variants.length }, () => [
          { key: '2026-08-24', label: 'V35 2026', endsOn: '2026-08-30' },
          { key: '2026-08-31', label: 'V36 2026', endsOn: '2026-09-06' }
        ])
      )
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimezone
    }
  })
})
