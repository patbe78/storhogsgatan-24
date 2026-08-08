import type { Profile } from '@/shared/types/profile'
import type { CalendarEvent } from '../types/calendar-event'

export const householdId = '24000000-0000-4000-8000-000000000024'
export const patrik: Profile = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Patrik',
  email: 'p@example.com',
  role: 'admin',
  avatar_url: null,
  color: '#2563eb',
  household_id: householdId,
  is_active: true,
  deactivated_at: null,
  deactivated_by: null,
  created_at: '',
  updated_at: ''
}
export const felix: Profile = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Felix',
  email: 'f@example.com',
  role: 'member',
  avatar_url: null,
  color: '#16a34a',
  household_id: householdId,
  is_active: true,
  deactivated_at: null,
  deactivated_by: null,
  created_at: '',
  updated_at: ''
}

export function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    householdId,
    title: 'Träning',
    description: 'Fotbollsträning',
    location: null,
    notes: null,
    categoryId: null,
    categoryName: null,
    categoryColor: null,
    createdBy: patrik.id,
    updatedBy: patrik.id,
    startsAt: '2026-08-10T16:00:00.000Z',
    endsAt: '2026-08-10T17:00:00.000Z',
    allDay: false,
    allDayStart: null,
    allDayEnd: null,
    isFamilyEvent: false,
    reminderOffsetsMinutes: [],
    externalSource: null,
    externalId: null,
    recurrenceSeriesId: null,
    participants: [{ id: felix.id, name: felix.name, color: felix.color }],
    createdAt: '',
    updatedAt: '',
    ...overrides
  }
}
