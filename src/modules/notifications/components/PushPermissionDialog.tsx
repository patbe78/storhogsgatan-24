export function PushPermissionDialog({
  open,
  busy,
  onConfirm,
  onClose
}: {
  open: boolean
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="pwa-dialog-backdrop">
      <section
        className="pwa-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-info-title"
      >
        <header>
          <div>
            <h2 id="push-info-title">Aktivera kalenderpåminnelser</h2>
            <p>Webbläsaren frågar i nästa steg om tillåtelse.</p>
          </div>
        </header>
        <p>
          Påminnelser skickas från Storhogsgatan 24:s backend och kan visas när appen är stängd.
          Endast kalenderns titel och tid visas i notisen.
        </p>
        <div className="pwa-dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Avbryt
          </button>
          <button type="button" className="primary-button" disabled={busy} onClick={onConfirm}>
            Fortsätt
          </button>
        </div>
      </section>
    </div>
  )
}
