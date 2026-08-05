export type CalendarFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarRecurrenceRule {
  id: string
  frequency: CalendarFrequency
  intervalValue: number
  startsOn: string
  endsOn: string | null
  occurrenceCount: number | null
  parentSeriesId: string | null
  splitFromDate: string | null
}

export interface CalendarRecurrenceInput {
  frequency: CalendarFrequency
  intervalValue: number
  endsOn?: string | null
  occurrenceCount?: number | null
}
