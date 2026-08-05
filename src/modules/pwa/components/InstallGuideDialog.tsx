import { useEffect, useRef } from 'react'
import { Share, X } from 'lucide-react'
import { usePwa } from '../PwaContext'

export function InstallGuideDialog() {
  const pwa = usePwa()
  const closeButton = useRef<HTMLButtonElement>(null)
  const { guideOpen, closeInstallGuide } = pwa

  useEffect(() => {
    if (!guideOpen) return
    closeButton.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeInstallGuide()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [closeInstallGuide, guideOpen])

  if (!pwa.guideOpen) return null

  return (
    <div className="pwa-dialog-backdrop" role="presentation">
      <section
        className="pwa-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
      >
        <header>
          <div>
            <p className="eyebrow">Snabb åtkomst</p>
            <h2 id="install-guide-title">Installera Storhogsgatan 24</h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="icon-button"
            aria-label="Stäng installationsguiden"
            onClick={pwa.closeInstallGuide}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        {pwa.isIos ? (
          <ol className="install-steps">
            <li>Öppna sidan i Safari.</li>
            <li>
              Tryck på Dela <Share size={18} aria-hidden="true" />.
            </li>
            <li>Välj Lägg till på hemskärmen.</li>
            <li>Tryck på Lägg till.</li>
          </ol>
        ) : (
          <p>Öppna webbläsarens meny och välj Installera appen eller Lägg till på startskärmen.</p>
        )}
        <div className="pwa-dialog-actions">
          <button type="button" className="primary-button" onClick={pwa.closeInstallGuide}>
            Klart
          </button>
          <button type="button" className="text-button" onClick={pwa.dismissInstallGuide}>
            Visa inte igen
          </button>
        </div>
      </section>
    </div>
  )
}
