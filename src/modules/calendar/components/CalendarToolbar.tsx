import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { CalendarView } from '../types/calendar-view'

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: 'month', label: 'Månad' },
  { value: 'week', label: 'Vecka' },
  { value: 'day', label: 'Dag' },
  { value: 'agenda', label: 'Kommande' }
]

export function CalendarToolbar({
  title,
  view,
  onView,
  onPrevious,
  onNext,
  onToday,
  onCreate,
  onCreateJobShift
}: {
  title: string
  view: CalendarView
  onView: (view: CalendarView) => void
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
  onCreate: () => void
  onCreateJobShift: () => void
}) {
  return (
    <header className="calendar-toolbar">
      <div className="calendar-toolbar__navigation">
        <button
          type="button"
          className="icon-button"
          aria-label="Föregående period"
          onClick={onPrevious}
        >
          <ChevronLeft />
        </button>
        <button type="button" className="secondary-button" onClick={onToday}>
          Idag
        </button>
        <button type="button" className="icon-button" aria-label="Nästa period" onClick={onNext}>
          <ChevronRight />
        </button>
        <h1>{title}</h1>
      </div>
      <div className="calendar-toolbar__actions">
        <div className="segmented" aria-label="Kalendervy">
          {VIEWS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={view === item.value}
              onClick={() => onView(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="calendar-create-actions">
          <button
            type="button"
            className="secondary-button job-shift-button"
            onClick={onCreateJobShift}
          >
            <Plus size={18} /> Jobbpass
          </button>
          <button type="button" className="primary-button new-event-button" onClick={onCreate}>
            <Plus size={18} /> Ny aktivitet
          </button>
        </div>
      </div>
    </header>
  )
}
