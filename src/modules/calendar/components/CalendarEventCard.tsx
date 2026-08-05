import type { CalendarViewItem } from '../types/calendar-view'
import { profileInitials } from '../utils/calendar-colors'

export function CalendarEventCard({
  item,
  compact = false,
  onSelect
}: {
  item: CalendarViewItem
  compact?: boolean
  onSelect: (item: CalendarViewItem) => void
}) {
  return (
    <button
      type="button"
      className={`calendar-event-card ${compact ? 'compact' : ''}`}
      style={{ '--event-color': item.color } as React.CSSProperties}
      aria-label={item.accessibilityLabel}
      onClick={() => onSelect(item)}
    >
      <span className="event-card__time">{item.timeLabel}</span>
      <strong>{item.title}</strong>
      <span
        className="participant-dots"
        aria-label={`Deltagare: ${item.participants.map((person) => person.name).join(', ')}`}
      >
        {item.participants.slice(0, 4).map((person) => (
          <span
            key={person.id}
            title={person.name}
            style={{ background: person.color || '#2563eb' }}
          >
            {profileInitials(person.name)}
          </span>
        ))}
      </span>
    </button>
  )
}
