import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentProfile } from '@/shared/services/profile'
import { getCalendarPermissions } from '../utils/calendar-permissions'

export function useCalendarPermissions() {
  const { data: profile = null, isLoading } = useQuery({
    queryKey: ['current-profile'],
    queryFn: getCurrentProfile,
    staleTime: 300000
  })
  return useMemo(() => ({ ...getCalendarPermissions(profile), isLoading }), [profile, isLoading])
}
