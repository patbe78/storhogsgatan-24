import type { CalendarRecurrenceInput } from '../types/calendar-recurrence'
import { addDateKeyDays } from './calendar-dates'

export type JobShiftRecurrence =
  'none' | 'weekdays' | 'weekly-1' | 'weekly-2' | 'weekly-3' | 'weekly-4'

export const JOB_SHIFT_RECURRENCE_OPTIONS: ReadonlyArray<{
  value: JobShiftRecurrence
  label: string
}> = [
  { value: 'none', label: 'Ingen återkommande' },
  { value: 'weekdays', label: 'Varje vardag (mån–fre)' },
  { value: 'weekly-1', label: 'Varje vecka' },
  { value: 'weekly-2', label: 'Varannan vecka' },
  { value: 'weekly-3', label: 'Var tredje vecka' },
  { value: 'weekly-4', label: 'Var fjärde vecka' }
]

export interface JobShiftEndWeek {
  key: string
  label: string
  endsOn: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function utcDateFromKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function isoWeekday(value: string): number {
  return utcDateFromKey(value).getUTCDay() || 7
}

function isoWeekIdentity(value: string): { week: number; year: number } {
  const thursday = utcDateFromKey(value)
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7))
  const year = thursday.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
  return { week, year }
}

export function jobShiftEndWeeks(startDate: string): JobShiftEndWeek[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return []
  const calendarYear = Number(startDate.slice(0, 4))
  const calendarYearEnd = `${calendarYear}-12-31`
  const weeks: JobShiftEndWeek[] = []
  const firstWeekStart = addDateKeyDays(startDate, 1 - isoWeekday(startDate))

  for (
    let weekStart = firstWeekStart;
    weekStart <= calendarYearEnd;
    weekStart = addDateKeyDays(weekStart, 7)
  ) {
    const { week, year } = isoWeekIdentity(weekStart)
    const weekEnd = addDateKeyDays(weekStart, 6)
    weeks.push({
      key: weekStart,
      label: `V${week} ${year}`,
      endsOn: weekEnd > calendarYearEnd ? calendarYearEnd : weekEnd
    })
  }
  return weeks
}

export function jobShiftRecurrenceInput(
  value: JobShiftRecurrence,
  endWeek: JobShiftEndWeek | undefined
): CalendarRecurrenceInput | null {
  if (value === 'none') return null
  if (!endWeek) throw new Error('Slutvecka saknas för återkommande jobbpass.')
  if (value === 'weekdays') {
    return {
      frequency: 'weekly',
      intervalValue: 1,
      weekdays: [1, 2, 3, 4, 5],
      endsOn: endWeek.endsOn,
      occurrenceCount: null
    }
  }
  return {
    frequency: 'weekly',
    intervalValue: Number(value.slice(-1)),
    weekdays: null,
    endsOn: endWeek.endsOn,
    occurrenceCount: null
  }
}
