import type { CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { CalendarEventCard } from './CalendarEventCard'

export function CalendarDayView({
  model,
  onSelect,
  onCreate
}: {
  model: CalendarViewModel
  onSelect: (item: CalendarViewItem) => void
  onCreate: (date: string) => void
}) {
  const day = model.days[0]
  return (
    <section className="day-view" aria-label="Dagvy">
      <button type="button" className="secondary-button" onClick={() => onCreate(day.date)}>
        + Aktivitet denna dag
      </button>
      {day.items.length ? (
        day.items.map((item) => (
          <CalendarEventCard key={item.key} item={item} onSelect={onSelect} />
        ))
      ) : (
        <p className="calendar-empty">Inga aktiviteter denna dag.</p>
      )}
    </section>
  )
}
