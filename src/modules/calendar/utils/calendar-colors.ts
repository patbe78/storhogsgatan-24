import type { CalendarEventParticipant } from '../types/calendar-event'

export const FAMILY_COLOR = '#0f766e'
export const MULTI_PARTICIPANT_COLOR = '#475467'
export const FALLBACK_PROFILE_COLOR = '#2563eb'

export function getEventColor(participants: CalendarEventParticipant[], family: boolean): string {
  if (family) return FAMILY_COLOR
  if (participants.length === 1) return participants[0].color || FALLBACK_PROFILE_COLOR
  return MULTI_PARTICIPANT_COLOR
}

export function profileInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
