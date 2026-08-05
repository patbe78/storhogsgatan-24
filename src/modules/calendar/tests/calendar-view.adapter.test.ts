import { createCalendarViewModel, toCalendarViewItem } from '../adapters/calendar-view.adapter'
import { singleOccurrence } from '../utils/calendar-recurrence'
import { event } from './fixtures'

describe('calendar view adapter', () => {
  it('skapar tillgänglig, presentationsneutral modell', () => {
    const occurrence = singleOccurrence(event())
    const item = toCalendarViewItem(occurrence)
    expect(item.accessibilityLabel).toContain('Felix')
    expect(item.occurrence).toBe(occurrence)
  })
  it('mappar månad utan att mutera domänen', () => {
    const occurrence = singleOccurrence(event())
    const model = createCalendarViewModel('month', new Date('2026-08-10T12:00:00'), [occurrence])
    expect(model.days).toHaveLength(42)
    expect(model.items).toHaveLength(1)
  })
})
