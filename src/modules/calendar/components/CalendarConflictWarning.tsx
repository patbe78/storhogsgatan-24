import type { CalendarConflict } from '../utils/calendar-conflict'

export function CalendarConflictWarning({
  conflicts,
  onSave,
  onBack
}: {
  conflicts: CalendarConflict[]
  onSave: () => void
  onBack: () => void
}) {
  const names = [...new Set(conflicts.map((conflict) => conflict.participantName))]
  return (
    <div className="conflict-warning" role="alertdialog" aria-labelledby="conflict-title">
      <h2 id="conflict-title">Tidskonflikt</h2>
      <p>{names.join(', ')} har redan en aktivitet under delar av denna tid.</p>
      <div className="dialog-actions">
        <button type="button" className="secondary-button" onClick={onBack}>
          Gå tillbaka och ändra
        </button>
        <button type="button" className="primary-button" onClick={onSave}>
          Spara ändå
        </button>
      </div>
    </div>
  )
}
