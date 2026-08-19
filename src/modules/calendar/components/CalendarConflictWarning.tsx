import type { CalendarConflict } from '../utils/calendar-conflict'

export function CalendarConflictWarning({
  conflicts,
  onSave,
  onBack,
  backLabel = 'Gå tillbaka och ändra',
  busy = false
}: {
  conflicts: CalendarConflict[]
  onSave: () => void
  onBack: () => void
  backLabel?: string
  busy?: boolean
}) {
  const names = [...new Set(conflicts.map((conflict) => conflict.participantName))]
  const participantNames =
    names.length < 2 ? names[0] : `${names.slice(0, -1).join(', ')} och ${names.at(-1)}`
  return (
    <div className="conflict-warning">
      <p>{participantNames} har redan en aktivitet som överlappar den här tiden.</p>
      <div className="dialog-actions">
        <button type="button" className="secondary-button" disabled={busy} onClick={onBack}>
          {backLabel}
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          aria-busy={busy}
          onClick={onSave}
        >
          {busy ? 'Sparar…' : 'Spara ändå'}
        </button>
      </div>
    </div>
  )
}
