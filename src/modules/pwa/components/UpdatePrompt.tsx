import { RefreshCw, X } from 'lucide-react'
import { usePwa } from '../PwaContext'

export function UpdatePrompt() {
  const pwa = usePwa()
  if (!pwa.needRefresh && !pwa.updateError) return null

  return (
    <aside className="pwa-update-prompt" role="status" aria-live="polite">
      <div>
        <strong>
          {pwa.updateError
            ? 'Uppdateringen kunde inte slutföras'
            : 'En ny version finns tillgänglig.'}
        </strong>
        {pwa.updateError && <p>{pwa.updateError}</p>}
        {pwa.needRefresh && pwa.hasUnsavedChanges && (
          <p>Spara eller avbryt öppna formulär innan appen uppdateras.</p>
        )}
      </div>
      {pwa.needRefresh && (
        <button
          type="button"
          className="primary-button"
          disabled={pwa.isUpdating || pwa.hasUnsavedChanges}
          onClick={() => void pwa.applyUpdate()}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {pwa.isUpdating ? 'Uppdaterar…' : 'Uppdatera'}
        </button>
      )}
      <button
        type="button"
        className="icon-button"
        aria-label="Stäng uppdateringsmeddelandet"
        onClick={() => {
          pwa.dismissUpdate()
          pwa.clearUpdateError()
        }}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
