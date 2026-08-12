import type { CalendarCategory } from '@/modules/calendar/types/calendar-category'
import type { CalendarEvent } from '@/modules/calendar/types/calendar-event'
import type { DashboardCategoryIdentity } from '../types/dashboard'

export const DASHBOARD_CATEGORY_NAMES = {
  work: 'Arbete',
  household: 'Hushållsarbete'
} as const

export function normalizeCategoryName(value: string | null | undefined): string {
  return (value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv-SE')
}

export function dashboardCategoryIdentity(
  categories: CalendarCategory[],
  canonicalName: string
): DashboardCategoryIdentity {
  const normalizedName = normalizeCategoryName(canonicalName)
  const matches = categories
    .filter((category) => normalizeCategoryName(category.name) === normalizedName)
    .sort((a, b) => Number(b.isSystem) - Number(a.isSystem))

  return {
    canonicalName: normalizedName,
    ids: new Set(matches.map((category) => category.id))
  }
}

export function eventMatchesCategory(
  event: CalendarEvent,
  identity: DashboardCategoryIdentity
): boolean {
  if (event.categoryId && identity.ids.has(event.categoryId)) return true
  return normalizeCategoryName(event.categoryName) === identity.canonicalName
}
