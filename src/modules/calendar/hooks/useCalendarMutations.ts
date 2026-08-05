import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CalendarEventInput, RecurringActionScope } from '../types/calendar-event'
import { deleteCalendarEvent, saveCalendarEvent } from '../services/calendar-event.service'
import { splitCalendarSeries } from '../services/calendar-recurrence.service'

export function useCalendarMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
  const save = useMutation({ mutationFn: saveCalendarEvent, onSuccess: invalidate })
  const remove = useMutation({
    mutationFn: ({ id, scope, date }: { id: string; scope: RecurringActionScope; date?: string }) =>
      deleteCalendarEvent(id, scope, date),
    onSuccess: invalidate
  })
  const split = useMutation({
    mutationFn: ({
      id,
      date,
      priorOccurrences,
      input
    }: {
      id: string
      date: string
      priorOccurrences: number
      input: CalendarEventInput
    }) => splitCalendarSeries(id, date, priorOccurrences, input),
    onSuccess: invalidate
  })
  return { save, remove, split }
}
