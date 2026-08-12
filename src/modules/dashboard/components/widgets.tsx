import { useId, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { occurrenceTimeLabel } from '@/modules/calendar/utils/calendar-display'
import type { DashboardOccurrenceItem } from '../types/dashboard'
import { dashboardOccurrenceDateLabel } from '../utils/dashboard-dates'
import './dashboard-calendar.css'

export function Widget({
  title,
  className = '',
  children
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section className={`widget dashboard-widget ${className}`} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {children}
    </section>
  )
}

export function DateWidget({ label, weekNumber }: { label: string; weekNumber: number }) {
  return (
    <section
      className="widget dashboard-widget dashboard-widget--date"
      aria-label="Datum och veckonummer"
    >
      <p className="dashboard-date">{label}</p>
      <p className="dashboard-week">Vecka {weekNumber}</p>
    </section>
  )
}

function ActivityList({
  items,
  showOwners = false
}: {
  items: DashboardOccurrenceItem[]
  showOwners?: boolean
}) {
  return (
    <ul className="dashboard-events">
      {items.map(({ occurrence, owners }) => {
        const color = occurrence.event.categoryColor ?? owners[0]?.color ?? '#64748b'
        return (
          <li key={occurrence.key} style={{ '--event-color': color } as CSSProperties}>
            <Link to={`/kalender?event=${encodeURIComponent(occurrence.key)}`}>
              <span className="dashboard-event-date">
                {dashboardOccurrenceDateLabel(occurrence)}
              </span>
              <strong>{occurrence.event.title}</strong>
              <span className="dashboard-event-time">{occurrenceTimeLabel(occurrence)}</span>
              {showOwners && (
                <span className="dashboard-event-owners" aria-label="Tillhör">
                  {owners.map((owner) => (
                    <span className="dashboard-owner" key={owner.id}>
                      <span
                        className="dashboard-owner__color"
                        style={{ backgroundColor: owner.color ?? '#64748b' }}
                        aria-hidden="true"
                      />
                      {owner.name}
                    </span>
                  ))}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function CardStatus({
  isLoading,
  isError,
  empty,
  hasItems
}: {
  isLoading: boolean
  isError: boolean
  empty: string
  hasItems: boolean
}) {
  if (isLoading) return <p className="muted">Laddar aktiviteter…</p>
  if (isError)
    return (
      <p className="muted" role="alert">
        Aktiviteterna kunde inte laddas.
      </p>
    )
  if (!hasItems) return <p className="muted dashboard-empty">{empty}</p>
  return null
}

export function EventsWidget({
  items,
  isLoading,
  isError
}: {
  items: DashboardOccurrenceItem[]
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Widget title="Mina kommande aktiviteter" className="dashboard-widget--upcoming">
      <CardStatus
        isLoading={isLoading}
        isError={isError}
        empty="Inga kommande aktiviteter de närmaste 14 dagarna."
        hasItems={items.length > 0}
      />
      {!isLoading && !isError && items.length > 0 && <ActivityList items={items} />}
    </Widget>
  )
}

function WeekControls({
  cardName,
  offset,
  setOffset
}: {
  cardName: string
  offset: 0 | 1
  setOffset: (offset: 0 | 1) => void
}) {
  return (
    <div className="dashboard-week-controls">
      <button
        type="button"
        aria-label={`Visa aktuell vecka för ${cardName}`}
        disabled={offset === 0}
        onClick={() => setOffset(0)}
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <span>{offset === 0 ? 'Denna vecka' : 'Nästa vecka'}</span>
      <button
        type="button"
        aria-label={`Visa nästa vecka för ${cardName}`}
        disabled={offset === 1}
        onClick={() => setOffset(1)}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

export function WeeklyActivitiesWidget({
  cardName,
  weekNumber,
  offset,
  setOffset,
  items,
  empty,
  showOwners = false,
  isLoading,
  isError
}: {
  cardName: string
  weekNumber: number
  offset: 0 | 1
  setOffset: (offset: 0 | 1) => void
  items: DashboardOccurrenceItem[]
  empty: string
  showOwners?: boolean
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Widget title={`${cardName} – Vecka ${weekNumber}`} className="dashboard-widget--weekly">
      <WeekControls cardName={cardName} offset={offset} setOffset={setOffset} />
      <CardStatus
        isLoading={isLoading}
        isError={isError}
        empty={empty}
        hasItems={items.length > 0}
      />
      {!isLoading && !isError && items.length > 0 && (
        <ActivityList items={items} showOwners={showOwners} />
      )}
    </Widget>
  )
}
