import type { CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { CalendarEventCard } from './CalendarEventCard'

export function CalendarAgendaView({
  model,
  onSelect
}: {
  model: CalendarViewModel
  onSelect: (item: CalendarViewItem) => void
}) {
  const days = model.days.filter((day) => day.items.length)
  if (!days.length) return <p className="calendar-empty">Inga kommande aktiviteter.</p>
  return (
    <div className="agenda-view" aria-label="Kommande aktiviteter">
      {days.map((day) => (
        <section key={day.date}>
          <h2>{day.label}</h2>
          {day.items.map((item) => (
            <CalendarEventCard key={item.key} item={item} onSelect={onSelect} />
          ))}
        </section>
      ))}
    </div>
  )
}
