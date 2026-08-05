import { Download, RefreshCw, Smartphone, Wifi } from 'lucide-react'
import { usePwa } from '../PwaContext'

export function PwaStatusPanel() {
  const pwa = usePwa()
  return (
    <section className="settings-card" aria-labelledby="app-settings-title">
      <div className="settings-card-heading">
        <Smartphone aria-hidden="true" />
        <div>
          <h2 id="app-settings-title">App</h2>
          <p>Installation, offline-stöd och uppdateringar.</p>
        </div>
      </div>
      <dl className="pwa-status-list">
        <div>
          <dt>Installation</dt>
          <dd>{pwa.isInstalled ? 'Installerad' : 'Inte installerad'}</dd>
        </div>
        <div>
          <dt>Offline-stöd</dt>
          <dd>
            {pwa.offlineReady ? 'Aktivt' : pwa.serviceWorkerSupported ? 'Tillgängligt' : 'Saknas'}
          </dd>
        </div>
        <div>
          <dt>Anslutning</dt>
          <dd>
            <Wifi size={16} aria-hidden="true" />
            {pwa.isOnline ? 'Online' : 'Offline'}
          </dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{__APP_VERSION__}</dd>
        </div>
      </dl>
      <div className="settings-actions">
        {pwa.installAvailable && !pwa.isInstalled && (
          <button
            type="button"
            className="primary-button"
            onClick={() => void pwa.requestInstall()}
          >
            <Download size={18} aria-hidden="true" />
            Installera appen
          </button>
        )}
        <button type="button" className="secondary-button" onClick={pwa.openInstallGuide}>
          Visa installationsguide
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={!pwa.serviceWorkerSupported || pwa.isUpdating}
          onClick={() => void pwa.checkForUpdate()}
        >
          <RefreshCw size={18} aria-hidden="true" />
          Sök efter uppdatering
        </button>
      </div>
    </section>
  )
}
