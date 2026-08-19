import { formatInTimeZone } from 'date-fns-tz'
import type { CalendarCategory } from '../types/calendar-category'
import { addDateKeyDays, CALENDAR_TIME_ZONE, stockholmLocalToIso } from './calendar-dates'

export const JOB_SHIFT_DURATION_PRESETS = [4, 6, 8, 9, 12] as const

export interface JobShiftTiming {
  startsAt: string
  endsAt: string
  durationMinutes: number
}

export function findWorkCategory(categories: CalendarCategory[]): CalendarCategory | null {
  return (
    categories.find(
      (category) =>
        category.isSystem &&
        !category.isArchived &&
        category.name.trim().toLocaleLowerCase('sv') === 'arbete'
    ) ?? null
  )
}

export function jobShiftTiming(
  startDate: string,
  startTime: string,
  endTime: string
): JobShiftTiming | null {
  if (!startDate || !startTime || !endTime) return null
  try {
    const endDate = endTime <= startTime ? addDateKeyDays(startDate, 1) : startDate
    const startsAt = stockholmLocalToIso(startDate, startTime)
    const endsAt = stockholmLocalToIso(endDate, endTime)
    const durationMinutes = Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60_000)
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null
    return { startsAt, endsAt, durationMinutes }
  } catch {
    return null
  }
}

export function endTimeForJobShiftPreset(
  startDate: string,
  startTime: string,
  hours: (typeof JOB_SHIFT_DURATION_PRESETS)[number]
): string {
  const startsAt = stockholmLocalToIso(startDate, startTime)
  return formatInTimeZone(Date.parse(startsAt) + hours * 60 * 60_000, CALENDAR_TIME_ZONE, 'HH:mm')
}

export function matchingJobShiftPreset(durationMinutes: number): number | null {
  return JOB_SHIFT_DURATION_PRESETS.find((hours) => hours * 60 === durationMinutes) ?? null
}
