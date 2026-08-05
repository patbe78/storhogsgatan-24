import { findCalendarConflicts } from '../utils/calendar-conflict'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event } from './fixtures'

describe('calendar conflicts', () => {
  it('hittar överlappning för gemensam deltagare', () => {
    const candidate = singleOccurrence(
      event({ id: 'b', startsAt: '2026-08-10T16:30:00Z', endsAt: '2026-08-10T17:30:00Z' })
    )
    expect(findCalendarConflicts(candidate, [singleOccurrence(event())])).toHaveLength(1)
  })
  it('tillåter angränsande tider', () => {
    const candidate = singleOccurrence(
      event({ id: 'b', startsAt: '2026-08-10T17:00:00Z', endsAt: '2026-08-10T18:00:00Z' })
    )
    expect(findCalendarConflicts(candidate, [singleOccurrence(event())])).toHaveLength(0)
  })
})
