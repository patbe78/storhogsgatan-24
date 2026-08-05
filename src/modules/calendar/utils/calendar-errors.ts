export function friendlyCalendarError(error: unknown): string {
  if (error instanceof Error && error.message.includes('CALENDAR_FORBIDDEN'))
    return 'Du har inte behörighet att utföra åtgärden.'
  if (error instanceof Error && error.message.includes('CALENDAR_VALIDATION'))
    return 'Aktiviteten innehåller ogiltiga uppgifter. Kontrollera formuläret.'
  return 'Något gick fel. Försök igen.'
}
