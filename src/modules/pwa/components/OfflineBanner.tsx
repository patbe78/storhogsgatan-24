import { WifiOff } from 'lucide-react'
import { usePwa } from '../PwaContext'

export function OfflineBanner() {
  const { isOnline } = usePwa()
  if (isOnline) return null
  return (
    <aside className="pwa-offline-banner" role="status">
      <WifiOff size={18} aria-hidden="true" />
      <span>Du är offline. Visade uppgifter kan vara inaktuella.</span>
    </aside>
  )
}
