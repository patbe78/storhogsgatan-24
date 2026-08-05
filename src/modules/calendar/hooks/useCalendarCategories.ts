import { useQuery } from '@tanstack/react-query'
import { getCalendarCategories } from '../services/calendar-category.service'

export function useCalendarCategories(includeArchived = true) {
  return useQuery({
    queryKey: ['calendar-categories', includeArchived],
    queryFn: () => getCalendarCategories(includeArchived),
    staleTime: 300000
  })
}
