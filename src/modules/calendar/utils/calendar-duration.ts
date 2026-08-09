export const CALENDAR_DURATION_OPTIONS: ReadonlyArray<{ minutes: number; label: string }> = [
  { minutes: 15, label: '15 minuter' },
  { minutes: 30, label: '30 minuter' },
  { minutes: 45, label: '45 minuter' },
  { minutes: 60, label: '1 timme' },
  { minutes: 90, label: '1 timme 30 minuter' },
  { minutes: 120, label: '2 timmar' },
  { minutes: 180, label: '3 timmar' }
]

export function durationMinutesBetween(startsAt?: string | null, endsAt?: string | null): number {
  if (!startsAt || !endsAt) return 60
  const difference = (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000
  return Number.isFinite(difference) && difference > 0 ? Math.max(1, Math.round(difference)) : 60
}

export function endIsoFromDuration(startsAt: string, durationMinutes: number): string | null {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) return null
  return new Date(Date.parse(startsAt) + durationMinutes * 60_000).toISOString()
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes} minuter`
  const hourLabel = `${hours} ${hours === 1 ? 'timme' : 'timmar'}`
  return remainingMinutes ? `${hourLabel} ${remainingMinutes} minuter` : hourLabel
}
