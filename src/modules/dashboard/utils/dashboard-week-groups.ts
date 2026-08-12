import { formatInTimeZone } from 'date-fns-tz'
import { CALENDAR_TIME_ZONE } from '@/modules/calendar/utils/calendar-dates'
import type {
  DashboardDateRange,
  DashboardOccurrenceItem,
  DashboardWeekGroup
} from '../types/dashboard'
import { dashboardWeekdayLabel } from './dashboard-dates'

function chronological(a: DashboardOccurrenceItem, b: DashboardOccurrenceItem): number {
  return (
    a.occurrence.startsAt.localeCompare(b.occurrence.startsAt) ||
    a.occurrence.endsAt.localeCompare(b.occurrence.endsAt) ||
    a.occurrence.key.localeCompare(b.occurrence.key)
  )
}

function dateKey(date: Date): string {
  return formatInTimeZone(date, CALENDAR_TIME_ZONE, 'yyyy-MM-dd')
}

export function groupDashboardWeekActivities(
  items: DashboardOccurrenceItem[],
  range: DashboardDateRange
): DashboardWeekGroup[] {
  const groups = new Map<string, DashboardWeekGroup>()
  const rangeEnd = range.end.getTime() - 1

  for (const item of [...items].sort(chronological)) {
    const visibleStart = new Date(
      Math.max(new Date(item.occurrence.startsAt).getTime(), range.start.getTime())
    )
    const visibleEnd = new Date(Math.min(new Date(item.occurrence.endsAt).getTime() - 1, rangeEnd))
    const startKey = dateKey(visibleStart)
    const endKey = dateKey(visibleEnd)
    const key = `${startKey}:${endKey}`
    const label =
      startKey === endKey
        ? dashboardWeekdayLabel(visibleStart)
        : `${dashboardWeekdayLabel(visibleStart)}–${dashboardWeekdayLabel(visibleEnd)}`
    const existing = groups.get(key)

    if (existing) existing.items.push(item)
    else groups.set(key, { key, label, items: [item] })
  }

  return [...groups.values()]
}

const GENERIC_WORK_TITLES = new Set(['arbete', 'arbetspass', 'jobb', 'jobba'])

export function isGenericWorkTitle(title: string): boolean {
  return GENERIC_WORK_TITLES.has(
    title.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE')
  )
}
