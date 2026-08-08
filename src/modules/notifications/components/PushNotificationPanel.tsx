import { Bell } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { PushNotificationStatus } from '../types/push-notification'
import { PushPermissionDialog } from './PushPermissionDialog'

const LABELS: Record<PushNotificationStatus, string> = {
  enabled: 'Aktiverade',
  not_enabled: 'Inte aktiverade',
  blocked: 'Blockerade',
  unavailable: 'Ej tillgängligt på denna enhet'
}

export function PushNotificationPanel() {
  const push = usePushNotifications()
  return (
    <>
      <section className="settings-card" aria-labelledby="push-settings-title">
        <div className="settings-card-heading">
          <Bell aria-hidden="true" />
          <div>
            <h2 id="push-settings-title">Kalenderpåminnelser</h2>
            <p>Pushnotiser för den här enheten.</p>
          </div>
        </div>
        <dl className="pwa-status-list">
          <div>
            <dt>Status</dt>
            <dd>{LABELS[push.status]}</dd>
          </div>
        </dl>
        {push.error && <p role="alert">{push.error}</p>}
        <div className="settings-actions">
          {push.status === 'enabled' ? (
            <button
              type="button"
              className="secondary-button"
              disabled={push.busy}
              onClick={() => void push.disable()}
            >
              Avregistrera den här enheten
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={push.busy || push.status === 'blocked' || push.status === 'unavailable'}
              onClick={push.openInformation}
            >
              Aktivera pushnotiser
            </button>
          )}
        </div>
      </section>
      <PushPermissionDialog
        open={push.informationOpen}
        busy={push.busy}
        onConfirm={() => void push.confirmEnable()}
        onClose={push.closeInformation}
      />
    </>
  )
}
