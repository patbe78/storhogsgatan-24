import { useId, type CSSProperties, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { occurrenceTimeLabel } from '@/modules/calendar/utils/calendar-display'
import type { DashboardDateRange, DashboardOccurrenceItem } from '../types/dashboard'
import { dashboardOccurrenceDateLabel } from '../utils/dashboard-dates'
import { groupDashboardWeekActivities, isGenericWorkTitle } from '../utils/dashboard-week-groups'
import './dashboard-calendar.css'

export function Widget({
  title,
  className = '',
  headerActions,
  children
}: {
  title: string
  className?: string
  headerActions?: ReactNode
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section className={`widget dashboard-widget ${className}`} aria-labelledby={titleId}>
      <div className="dashboard-widget__header">
        <h2 id={titleId}>{title}</h2>
        {headerActions}
      </div>
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
      <p className="dashboard-week">V{weekNumber}</p>
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
        const timeLabel = dashboardTimeLabel(occurrence)
        return (
          <li key={occurrence.key} style={{ '--event-color': color } as CSSProperties}>
            <Link to={`/kalender?event=${encodeURIComponent(occurrence.key)}`}>
              <span className="dashboard-event-date">
                {dashboardOccurrenceDateLabel(occurrence)}
              </span>
              <strong>{occurrence.event.title}</strong>
              {timeLabel && <span className="dashboard-event-time">{timeLabel}</span>}
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

function dashboardTimeLabel(occurrence: DashboardOccurrenceItem['occurrence']): string | null {
  return occurrence.allDay ? null : occurrenceTimeLabel(occurrence)
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
    <div className="dashboard-week-controls" aria-label={`Veckonavigering för ${cardName}`}>
      <button
        type="button"
        aria-label={`Visa aktuell vecka för ${cardName}`}
        disabled={offset === 0}
        onClick={() => setOffset(0)}
      >
        <span className="dashboard-week-control__visual">
          <ChevronLeft size={18} aria-hidden="true" />
        </span>
      </button>
      <button
        type="button"
        aria-label={`Visa nästa vecka för ${cardName}`}
        disabled={offset === 1}
        onClick={() => setOffset(1)}
      >
        <span className="dashboard-week-control__visual">
          <ChevronRight size={18} aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}

function compactActivityLabel(
  item: DashboardOccurrenceItem,
  activityType: 'work' | 'household'
): string {
  const { occurrence } = item
  if (activityType === 'household') return occurrence.event.title
  const showTitle = occurrence.allDay || !isGenericWorkTitle(occurrence.event.title)
  return [showTitle ? occurrence.event.title : null, dashboardTimeLabel(occurrence)]
    .filter(Boolean)
    .join(' · ')
}

function CompactWeekList({
  items,
  range,
  showOwners,
  activityType
}: {
  items: DashboardOccurrenceItem[]
  range: DashboardDateRange
  showOwners: boolean
  activityType: 'work' | 'household'
}) {
  const groups = groupDashboardWeekActivities(items, range)

  return (
    <div className="dashboard-week-groups">
      {groups.map((group) => (
        <section className="dashboard-week-group" key={group.key}>
          <h3>{group.label}</h3>
          <ul className="dashboard-week-activities">
            {group.items.map((item) => {
              const { occurrence, owners } = item
              const detail = compactActivityLabel(item, activityType)
              const ownerNames = owners.map((owner) => owner.name).join(', ')
              return (
                <li key={occurrence.key}>
                  <Link
                    to={`/kalender?event=${encodeURIComponent(occurrence.key)}`}
                    aria-label={[showOwners ? ownerNames : null, detail].filter(Boolean).join(', ')}
                  >
                    {showOwners && (
                      <span className="dashboard-week-owners">
                        {owners.map((owner) => (
                          <span className="dashboard-week-owner" key={owner.id}>
                            <span
                              className="dashboard-week-owner__color"
                              style={{ backgroundColor: owner.color ?? '#64748b' }}
                              aria-hidden="true"
                            />
                            <span>{owner.name}</span>
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="dashboard-week-activity-detail">{detail}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function WeeklyActivitiesWidget({
  cardName,
  weekNumber,
  range,
  offset,
  setOffset,
  items,
  empty,
  showOwners = false,
  activityType,
  isLoading,
  isError
}: {
  cardName: string
  weekNumber: number
  range: DashboardDateRange
  offset: 0 | 1
  setOffset: (offset: 0 | 1) => void
  items: DashboardOccurrenceItem[]
  empty: string
  showOwners?: boolean
  activityType: 'work' | 'household'
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Widget
      title={`${cardName} · V${weekNumber}`}
      className="dashboard-widget--weekly"
      headerActions={<WeekControls cardName={cardName} offset={offset} setOffset={setOffset} />}
    >
      <CardStatus
        isLoading={isLoading}
        isError={isError}
        empty={empty}
        hasItems={items.length > 0}
      />
      {!isLoading && !isError && items.length > 0 && (
        <CompactWeekList
          items={items}
          range={range}
          showOwners={showOwners}
          activityType={activityType}
        />
      )}
    </Widget>
  )
}
