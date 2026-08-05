import { useState } from 'react'
import { usePwa } from '../PwaContext'
import { isInstallGuideDismissed } from '../services/pwa-storage'

export function InstallAppButton({ className = 'secondary-button' }: { className?: string }) {
  const pwa = usePwa()
  const [guideDismissed] = useState(isInstallGuideDismissed)

  if (pwa.isInstalled) return null
  if (pwa.installAvailable)
    return (
      <button className={className} type="button" onClick={() => void pwa.requestInstall()}>
        Installera appen
      </button>
    )
  if (pwa.isIos && !guideDismissed)
    return (
      <button className={className} type="button" onClick={pwa.openInstallGuide}>
        Installera på iPhone eller iPad
      </button>
    )
  return null
}
