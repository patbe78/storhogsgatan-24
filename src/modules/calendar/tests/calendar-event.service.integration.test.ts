import { vi } from 'vitest'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@/shared/services/supabase', () => ({ supabase: { rpc: mocks.rpc } }))

import { deleteCalendarEvent, saveCalendarEvent } from '../services/calendar-event.service'
import { splitCalendarSeries } from '../services/calendar-recurrence.service'
import type { CalendarEventInput } from '../types/calendar-event'

const input: CalendarEventInput = {
  title: 'Familjemöte',
  description: 'Planera veckan',
  startsAt: '2026-08-10T16:00:00Z',
  endsAt: '2026-08-10T17:00:00Z',
  allDay: false,
  isFamilyEvent: false,
  reminderOffsetsMinutes: [],
  participantIds: ['profile-1', 'profile-2']
}

describe('calendar event service integration contract', () => {
  beforeEach(() => mocks.rpc.mockReset())
  it('skapar och redigerar med samtliga deltagare genom mutations-RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: 'event-1', error: null })
    await expect(saveCalendarEvent(input)).resolves.toBe('event-1')
    expect(mocks.rpc).toHaveBeenCalledWith('calendar_save_event', {
      p_event_id: null,
      p_payload: input
    })
    await saveCalendarEvent({ ...input, id: 'event-1', title: 'Uppdaterat' })
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      'calendar_save_event',
      expect.objectContaining({ p_event_id: 'event-1' })
    )
  })
  it('raderar hela serien eller denna och framtida', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null })
    await deleteCalendarEvent('event-1', 'series')
    await deleteCalendarEvent('event-1', 'future', '2026-08-24')
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, 'calendar_delete_event', {
      p_event_id: 'event-1',
      p_scope: 'future',
      p_occurrence_date: '2026-08-24'
    })
  })
  it('skickar verifierat antal tidigare förekomster vid seriedelning', async () => {
    mocks.rpc.mockResolvedValue({ data: 'event-2', error: null })
    await splitCalendarSeries('event-1', '2026-08-24', 2, input)
    expect(mocks.rpc).toHaveBeenCalledWith('calendar_split_series', {
      p_event_id: 'event-1',
      p_occurrence_date: '2026-08-24',
      p_prior_occurrences: 2,
      p_payload: input
    })
  })
})
