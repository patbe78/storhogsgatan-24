export function CalendarStatus({
  loading,
  error,
  empty,
  onRetry
}: {
  loading: boolean
  error: boolean
  empty: boolean
  onRetry: () => void
}) {
  if (loading)
    return (
      <div className="calendar-skeleton" role="status">
        Laddar kalendern…
      </div>
    )
  if (error)
    return (
      <div className="calendar-error" role="alert">
        <p>Kalendern kunde inte laddas.</p>
        <button type="button" className="secondary-button" onClick={onRetry}>
          Försök igen
        </button>
      </div>
    )
  if (empty) return <p className="calendar-empty">Inga aktiviteter i den här perioden.</p>
  return null
}
