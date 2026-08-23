import { addWeeks, endOfISOWeek, getISOWeek, getISOWeekYear, startOfISOWeek } from 'date-fns'
import type { CalendarRecurrenceInput } from '../types/calendar-recurrence'
import { parseDateKey, toDateKey } from './calendar-dates'

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

export function jobShiftEndWeeks(startDate: string): JobShiftEndWeek[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return []
  const start = parseDateKey(startDate)
  const calendarYear = Number(startDate.slice(0, 4))
  const calendarYearEnd = parseDateKey(`${calendarYear}-12-31`)
  const weeks: JobShiftEndWeek[] = []

  for (
    let weekStart = startOfISOWeek(start);
    weekStart <= calendarYearEnd;
    weekStart = addWeeks(weekStart, 1)
  ) {
    const isoWeek = getISOWeek(weekStart)
    const isoYear = getISOWeekYear(weekStart)
    const weekEnd = endOfISOWeek(weekStart)
    weeks.push({
      key: toDateKey(weekStart),
      label: `V${isoWeek} ${isoYear}`,
      endsOn: toDateKey(weekEnd > calendarYearEnd ? calendarYearEnd : weekEnd)
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
