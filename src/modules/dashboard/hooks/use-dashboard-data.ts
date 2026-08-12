import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCalendarCategories } from '@/modules/calendar/hooks/useCalendarCategories'
import { getCalendarEvents } from '@/modules/calendar/services/calendar-event.service'
import { generateOccurrences } from '@/modules/calendar/utils/calendar-recurrence'
import { getDashboardProfiles } from '../services/dashboard-profile.service'
import { dashboardDataRange } from '../utils/dashboard-dates'

export function useDashboardData(profileId: string | undefined, now: Date) {
  const range = useMemo(() => dashboardDataRange(now), [now])
  const events = useQuery({
    queryKey: [
      'calendar-events',
      'dashboard',
      profileId,
      range.start.toISOString(),
      range.end.toISOString()
    ],
    queryFn: () => getCalendarEvents(range.start, range.end),
    enabled: Boolean(profileId),
    select: (rows) =>
      rows.flatMap(({ event, recurrence }) =>
        generateOccurrences(event, recurrence, range.start, range.end)
      )
  })
  const categories = useCalendarCategories(false)
  const profiles = useQuery({
    queryKey: ['dashboard-profiles', profileId],
    queryFn: getDashboardProfiles,
    enabled: Boolean(profileId),
    staleTime: 300000
  })

  return {
    occurrences: events.data ?? [],
    categories: categories.data ?? [],
    profiles: profiles.data ?? [],
    isLoading: events.isLoading || categories.isLoading || profiles.isLoading,
    isError: events.isError || categories.isError || profiles.isError
  }
}
