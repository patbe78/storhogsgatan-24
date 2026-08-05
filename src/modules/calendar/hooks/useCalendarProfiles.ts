import { useQuery } from '@tanstack/react-query'
import { getCalendarProfiles } from '../services/calendar-event.service'

export function useCalendarProfiles() {
  return useQuery({
    queryKey: ['calendar-profiles'],
    queryFn: getCalendarProfiles,
    staleTime: 300000
  })
}
