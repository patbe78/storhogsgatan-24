export function RecurringEventActionDialog({
  action,
  onSeries,
  onFuture,
  onCancel
}: {
  action: 'redigera' | 'radera'
  onSeries: () => void
  onFuture: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="dialog-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="series-action-title"
    >
      <h2 id="series-action-title">
        {action === 'redigera' ? 'Redigera' : 'Radera'} återkommande aktivitet
      </h2>
      <p>Vilken del av serien vill du {action}?</p>
      <div className="dialog-actions vertical">
        <button type="button" className="primary-button" onClick={onSeries}>
          Hela serien
        </button>
        <button type="button" className="secondary-button" onClick={onFuture}>
          Denna och framtida
        </button>
        <button type="button" className="text-button" onClick={onCancel}>
          Avbryt
        </button>
      </div>
    </div>
  )
}
