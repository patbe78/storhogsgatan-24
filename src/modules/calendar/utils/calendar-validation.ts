import type { CalendarEventInput } from '../types/calendar-event'

export type CalendarValidationErrors = Partial<
  Record<keyof CalendarEventInput | 'recurrence', string>
>

export function validateCalendarEvent(input: CalendarEventInput): CalendarValidationErrors {
  const errors: CalendarValidationErrors = {}
  if (!input.title.trim()) errors.title = 'Ange en titel.'
  else if (input.title.length > 150) errors.title = 'Titeln får vara högst 150 tecken.'
  if (input.description.trim().length > 2000)
    errors.description = 'Beskrivningen får vara högst 2 000 tecken.'
  if ((input.location?.length ?? 0) > 250) errors.location = 'Platsen får vara högst 250 tecken.'
  if ((input.notes?.length ?? 0) > 5000) errors.notes = 'Anteckningen får vara högst 5 000 tecken.'
  if (!input.participantIds.length) errors.participantIds = 'Välj minst en deltagare.'
  if (input.allDay) {
    if (!input.allDayStart) errors.allDayStart = 'Ange startdatum.'
    if (!input.allDayEnd) errors.allDayEnd = 'Ange slutdatum.'
    if (input.allDayStart && input.allDayEnd && input.allDayEnd < input.allDayStart)
      errors.allDayEnd = 'Slutdatum får inte ligga före startdatum.'
  } else {
    if (!input.startsAt) errors.startsAt = 'Ange startdatum och starttid.'
    if (!input.endsAt) errors.endsAt = 'Ange slutdatum och sluttid.'
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt)
      errors.endsAt = 'Sluttiden måste ligga efter starttiden.'
  }
  if (input.recurrence) {
    const rule = input.recurrence
    if (!Number.isInteger(rule.intervalValue) || rule.intervalValue <= 0)
      errors.recurrence = 'Intervallet måste vara ett positivt heltal.'
    else if (rule.endsOn && rule.occurrenceCount)
      errors.recurrence = 'Välj antingen slutdatum eller antal förekomster.'
    else if (rule.occurrenceCount != null && rule.occurrenceCount <= 0)
      errors.recurrence = 'Antalet förekomster måste vara större än noll.'
  }
  return errors
}
