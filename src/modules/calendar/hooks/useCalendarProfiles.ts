import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth'
import { getCalendarProfiles } from '../services/calendar-event.service'

export function useCalendarProfiles() {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['calendar-profiles', userId],
    queryFn: getCalendarProfiles,
    enabled: Boolean(userId),
    staleTime: 300000
  })
}
