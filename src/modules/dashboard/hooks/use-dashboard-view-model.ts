import { useMemo, useState } from 'react'
import type { Profile } from '@/shared/types/profile'
import {
  selectFamilyWorkActivities,
  selectHouseholdActivities,
  selectMyWorkActivities,
  selectUpcomingPersonalActivities
} from '../selectors/dashboard-selectors'
import type { DashboardProfile } from '../types/dashboard'
import { DASHBOARD_CATEGORY_NAMES, dashboardCategoryIdentity } from '../utils/dashboard-categories'
import {
  dashboardDateLabel,
  dashboardIsoWeek,
  dashboardTodayRange,
  dashboardWeekRange
} from '../utils/dashboard-dates'
import { useDashboardData } from './use-dashboard-data'

function dashboardProfile(profile: Profile): DashboardProfile {
  return {
    id: profile.id,
    name: profile.name,
    role: profile.role,
    color: profile.color,
    is_active: profile.is_active
  }
}

export function useDashboardViewModel(profile: Profile | null) {
  const [now] = useState(() => new Date())
  const [myWorkWeek, setMyWorkWeek] = useState<0 | 1>(0)
  const [familyWorkWeek, setFamilyWorkWeek] = useState<0 | 1>(0)
  const [householdWeek, setHouseholdWeek] = useState<0 | 1>(0)
  const data = useDashboardData(profile?.id, now)

  return useMemo(() => {
    const currentProfile = profile ? dashboardProfile(profile) : null
    const workCategory = dashboardCategoryIdentity(data.categories, DASHBOARD_CATEGORY_NAMES.work)
    const householdCategory = dashboardCategoryIdentity(
      data.categories,
      DASHBOARD_CATEGORY_NAMES.household
    )
    const emptyItems: never[] = []
    const weekly = (
      offset: 0 | 1,
      items: ReturnType<typeof selectMyWorkActivities>,
      setOffset: (offset: 0 | 1) => void
    ) => ({
      offset,
      weekNumber: dashboardIsoWeek(now, offset),
      range: dashboardWeekRange(now, offset),
      items,
      setOffset
    })

    return {
      date: { label: dashboardDateLabel(now), weekNumber: dashboardIsoWeek(now) },
      upcoming: currentProfile
        ? selectUpcomingPersonalActivities(
            data.occurrences,
            currentProfile,
            dashboardTodayRange(now),
            workCategory,
            householdCategory
          )
        : emptyItems,
      myWork: weekly(
        myWorkWeek,
        currentProfile
          ? selectMyWorkActivities(
              data.occurrences,
              currentProfile,
              workCategory,
              dashboardWeekRange(now, myWorkWeek)
            )
          : emptyItems,
        setMyWorkWeek
      ),
      familyWork: weekly(
        familyWorkWeek,
        currentProfile
          ? selectFamilyWorkActivities(
              data.occurrences,
              currentProfile,
              data.profiles,
              workCategory,
              dashboardWeekRange(now, familyWorkWeek)
            )
          : emptyItems,
        setFamilyWorkWeek
      ),
      household: weekly(
        householdWeek,
        currentProfile
          ? selectHouseholdActivities(
              data.occurrences,
              currentProfile,
              householdCategory,
              dashboardWeekRange(now, householdWeek)
            )
          : emptyItems,
        setHouseholdWeek
      ),
      isLoading: data.isLoading,
      isError: data.isError
    }
  }, [data, familyWorkWeek, householdWeek, myWorkWeek, now, profile])
}
