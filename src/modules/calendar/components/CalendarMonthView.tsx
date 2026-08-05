import type { CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { CalendarEventCard } from './CalendarEventCard'

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
export function CalendarMonthView({
  model,
  onSelect,
  onCreate
}: {
  model: CalendarViewModel
  onSelect: (item: CalendarViewItem) => void
  onCreate: (date: string) => void
}) {
  return (
    <div className="month-view" aria-label="Månadsvy">
      {WEEKDAYS.map((day) => (
        <div className="month-view__weekday" key={day}>
          {day}
        </div>
      ))}
      {model.days.map((day) => (
        <section
          key={day.date}
          className={`month-day ${day.isToday ? 'today' : ''} ${day.isOutsidePeriod ? 'outside' : ''}`}
          aria-label={day.date}
        >
          <button
            type="button"
            className="month-day__number"
            aria-label={`Skapa aktivitet ${day.date}`}
            onClick={() => onCreate(day.date)}
          >
            {day.label}
          </button>
          <div className="month-day__events">
            {day.items.slice(0, 3).map((item) => (
              <CalendarEventCard key={item.key} item={item} compact onSelect={onSelect} />
            ))}
            {day.items.length > 3 && (
              <span className="more-events">+{day.items.length - 3} fler</span>
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
