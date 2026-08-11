import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/modules/auth'
import { getCalendarCategories } from '../services/calendar-category.service'

export function useCalendarCategories(includeArchived = true) {
  const { session } = useAuth()
  const userId = session?.user.id
  return useQuery({
    queryKey: ['calendar-categories', userId, includeArchived],
    queryFn: () => getCalendarCategories(includeArchived),
    enabled: Boolean(userId),
    staleTime: 300000
  })
}
