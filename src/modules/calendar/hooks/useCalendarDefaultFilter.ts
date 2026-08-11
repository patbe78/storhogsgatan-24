import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth'
import { getCalendarDefaultFilter } from '../services/calendar-default-filter.service'

export const CALENDAR_DEFAULT_FILTER_QUERY_KEY = ['calendar-default-filter'] as const
export const calendarDefaultFilterQueryKey = (userId: string | undefined) =>
  [...CALENDAR_DEFAULT_FILTER_QUERY_KEY, userId] as const

export function useCalendarDefaultFilter() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: calendarDefaultFilterQueryKey(userId),
    queryFn: getCalendarDefaultFilter,
    enabled: Boolean(userId),
    staleTime: 0
  })
}
