import type { CalendarViewItem } from '../types/calendar-view'
import type { CalendarPermissions } from '../types/calendar-permissions'

export function CalendarEventDetails({
  item,
  permissions,
  onEdit,
  onDelete
}: {
  item: CalendarViewItem
  permissions: CalendarPermissions
  onEdit: () => void
  onDelete: () => void
}) {
  const event = item.occurrence.event
  return (
    <article className="event-details">
      <span className="event-color-bar" style={{ background: item.color }} />
      <p>
        <strong>{item.dateLabel}</strong> · {item.timeLabel}
      </p>
      <p>{event.description}</p>
      {event.location && (
        <p>
          <strong>Plats:</strong> {event.location}
        </p>
      )}
      {event.categoryName && (
        <p>
          <strong>Kategori:</strong> {event.categoryName}
        </p>
      )}
      <p>
        <strong>Deltagare:</strong> {event.participants.map((person) => person.name).join(', ')}
      </p>
      {event.notes && (
        <p>
          <strong>Anteckning:</strong> {event.notes}
        </p>
      )}
      <div className="dialog-actions">
        {permissions.canEdit(event) && (
          <button type="button" className="secondary-button" onClick={onEdit}>
            Redigera
          </button>
        )}
        {permissions.canDelete(event) && (
          <button type="button" className="danger-button" onClick={onDelete}>
            Radera
          </button>
        )}
      </div>
    </article>
  )
}
