import type { CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { CalendarEventCard } from './CalendarEventCard'

export function CalendarWeekView({
  model,
  onSelect,
  onCreate
}: {
  model: CalendarViewModel
  onSelect: (item: CalendarViewItem) => void
  onCreate: (date: string) => void
}) {
  return (
    <div className="period-grid week-view" aria-label="Veckovy">
      {model.days.map((day) => (
        <section key={day.date} className={day.isToday ? 'today' : ''}>
          <button type="button" className="period-day-heading" onClick={() => onCreate(day.date)}>
            {day.label}
          </button>
          <div>
            {day.items.map((item) => (
              <CalendarEventCard key={item.key} item={item} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
