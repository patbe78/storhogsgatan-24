import type { CSSProperties } from 'react'
import type { CalendarViewItem, CalendarViewModel } from '../types/calendar-view'
import { createCalendarMonthWeeks } from '../utils/calendar-month'
import { CalendarEventCard } from './CalendarEventCard'

const WEEKDAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']

function monthHeading(title: string): string {
  return title.replace(/^./u, (letter) => letter.toLocaleUpperCase('sv-SE'))
}

export function CalendarMonthView({
  model,
  selectedDate,
  onSelect,
  onCreate
}: {
  model: CalendarViewModel
  selectedDate?: string
  onSelect: (item: CalendarViewItem) => void
  onCreate: (date: string) => void
}) {
  const weeks = createCalendarMonthWeeks(model)
  const title = monthHeading(model.title)

  return (
    <section className="month-calendar" aria-labelledby="month-calendar-heading">
      <header className="month-calendar__header">
        <h2 id="month-calendar-heading">{title}</h2>
        <div className="month-view__weekdays">
          <span className="month-view__week-gutter" />
          {WEEKDAYS.map((day) => (
            <span className="month-view__weekday" role="columnheader" key={day}>
              {day}
            </span>
          ))}
        </div>
      </header>
      <div className="month-view" aria-label={`Månadsvy ${title}`}>
        {weeks.map((week) => (
          <div
            className="month-week"
            data-week={week.weekNumber}
            key={week.key}
            style={{ '--all-day-lanes': week.laneCount } as CSSProperties}
          >
            <span className="month-week__number" aria-label={`Vecka ${week.weekNumber}`}>
              v{week.weekNumber}
            </span>
            {week.days.map((day, index) => {
              const timedItems = day.items.filter((item) => !item.allDay)
              const selected = day.date === selectedDate
              return (
                <section
                  key={day.date}
                  className={`month-day ${day.isToday ? 'today' : ''} ${selected ? 'selected' : ''} ${day.isOutsidePeriod ? 'outside' : ''}`}
                  style={{ gridColumn: index + 2 }}
                  aria-label={day.date}
                  aria-current={day.isToday ? 'date' : undefined}
                >
                  <button
                    type="button"
                    className="month-day__number"
                    aria-label={`Skapa aktivitet ${day.date}`}
                    aria-pressed={selected}
                    onClick={() => onCreate(day.date)}
                  >
                    {day.label}
                  </button>
                  <div className="month-day__events">
                    {timedItems.slice(0, 3).map((item) => (
                      <CalendarEventCard key={item.key} item={item} compact onSelect={onSelect} />
                    ))}
                    {timedItems.length > 3 && (
                      <span className="more-events">+{timedItems.length - 3} fler</span>
                    )}
                  </div>
                </section>
              )
            })}
            <div className="month-week__all-day-layer">
              {week.segments.map((segment) => (
                <button
                  type="button"
                  className={`month-all-day-segment ${segment.isStart ? 'starts' : 'continues-before'} ${segment.isEnd ? 'ends' : 'continues-after'}`}
                  style={
                    {
                      '--event-color': segment.item.color,
                      gridColumn: `${segment.startColumn} / span ${segment.span}`,
                      gridRow: segment.lane + 1
                    } as CSSProperties
                  }
                  key={`${segment.item.key}:${week.key}`}
                  aria-label={`${segment.item.accessibilityLabel}. Heldagsaktivitet${segment.isStart ? '' : ', fortsätter från föregående vecka'}${segment.isEnd ? '' : ', fortsätter nästa vecka'}`}
                  onClick={() => onSelect(segment.item)}
                >
                  <strong>{segment.item.title}</strong>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
