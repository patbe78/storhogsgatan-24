import type { CalendarOccurrence } from '@/modules/calendar/types/calendar-event'
import type {
  DashboardCategoryIdentity,
  DashboardDateRange,
  DashboardOccurrenceItem,
  DashboardProfile
} from '../types/dashboard'
import { eventMatchesCategory } from '../utils/dashboard-categories'
import { intervalsOverlap, occurrenceBelongsToDashboardWeek } from '../utils/dashboard-dates'
import { familyWorkProfiles, ourWorkProfiles } from '../utils/dashboard-roles'

function chronological(a: CalendarOccurrence, b: CalendarOccurrence): number {
  return (
    a.startsAt.localeCompare(b.startsAt) ||
    a.endsAt.localeCompare(b.endsAt) ||
    a.key.localeCompare(b.key)
  )
}

function participates(occurrence: CalendarOccurrence, profileId: string): boolean {
  return occurrence.event.participants.some((participant) => participant.id === profileId)
}

function inRange(occurrence: CalendarOccurrence, range: DashboardDateRange): boolean {
  return intervalsOverlap(occurrence.startsAt, occurrence.endsAt, range)
}

function personalCategoryItems(
  occurrences: CalendarOccurrence[],
  profile: DashboardProfile,
  category: DashboardCategoryIdentity,
  range: DashboardDateRange
): DashboardOccurrenceItem[] {
  return occurrences
    .filter(
      (occurrence) =>
        occurrenceBelongsToDashboardWeek(occurrence, range) &&
        participates(occurrence, profile.id) &&
        eventMatchesCategory(occurrence.event, category)
    )
    .sort(chronological)
    .map((occurrence) => ({ occurrence, owners: [profile] }))
}

export function selectUpcomingPersonalActivities(
  occurrences: CalendarOccurrence[],
  profile: DashboardProfile,
  range: DashboardDateRange,
  workCategory: DashboardCategoryIdentity,
  householdCategory: DashboardCategoryIdentity,
  limit = 6
): DashboardOccurrenceItem[] {
  return occurrences
    .filter(
      (occurrence) =>
        inRange(occurrence, range) &&
        participates(occurrence, profile.id) &&
        !eventMatchesCategory(occurrence.event, workCategory) &&
        !eventMatchesCategory(occurrence.event, householdCategory)
    )
    .sort(chronological)
    .slice(0, limit)
    .map((occurrence) => ({ occurrence, owners: [profile] }))
}

export function selectMyWorkActivities(
  occurrences: CalendarOccurrence[],
  profile: DashboardProfile,
  workCategory: DashboardCategoryIdentity,
  range: DashboardDateRange
): DashboardOccurrenceItem[] {
  return personalCategoryItems(occurrences, profile, workCategory, range)
}

export function selectOurWorkActivities(
  occurrences: CalendarOccurrence[],
  currentProfile: DashboardProfile,
  profiles: DashboardProfile[],
  workCategory: DashboardCategoryIdentity,
  range: DashboardDateRange
): DashboardOccurrenceItem[] {
  const targets = ourWorkProfiles(currentProfile, profiles)
  const targetIds = new Set(targets.map((profile) => profile.id))

  return occurrences
    .filter(
      (occurrence) =>
        occurrenceBelongsToDashboardWeek(occurrence, range) &&
        eventMatchesCategory(occurrence.event, workCategory) &&
        occurrence.event.participants.some((participant) => targetIds.has(participant.id))
    )
    .sort(chronological)
    .map((occurrence) => ({
      occurrence,
      owners: targets.filter((profile) => participates(occurrence, profile.id))
    }))
}

export function selectHouseholdActivities(
  occurrences: CalendarOccurrence[],
  profile: DashboardProfile,
  householdCategory: DashboardCategoryIdentity,
  range: DashboardDateRange
): DashboardOccurrenceItem[] {
  return personalCategoryItems(occurrences, profile, householdCategory, range)
}

export function selectFamilyWorkActivities(
  occurrences: CalendarOccurrence[],
  currentProfile: DashboardProfile,
  profiles: DashboardProfile[],
  workCategory: DashboardCategoryIdentity,
  range: DashboardDateRange
): DashboardOccurrenceItem[] {
  const targets = familyWorkProfiles(currentProfile, profiles)
  const targetIds = new Set(targets.map((profile) => profile.id))

  return occurrences
    .filter(
      (occurrence) =>
        occurrenceBelongsToDashboardWeek(occurrence, range) &&
        eventMatchesCategory(occurrence.event, workCategory) &&
        occurrence.event.participants.some((participant) => targetIds.has(participant.id))
    )
    .sort(chronological)
    .map((occurrence) => ({
      occurrence,
      owners: targets.filter((profile) => participates(occurrence, profile.id))
    }))
}
