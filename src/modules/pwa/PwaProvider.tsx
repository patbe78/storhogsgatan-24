import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { usePwaRegistration } from './hooks/usePwaRegistration'
import { useStandaloneMode } from './hooks/useStandaloneMode'
import { setInstallGuideDismissed } from './services/pwa-storage'
import { PwaContext } from './PwaContext'
import type { PwaContextValue } from './types/pwa'
import { isIosDevice } from './utils/platform'
import { InstallGuideDialog } from './components/InstallGuideDialog'
import { OfflineBanner } from './components/OfflineBanner'
import { UpdatePrompt } from './components/UpdatePrompt'
import './pwa.css'

export function PwaProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus()
  const isStandalone = useStandaloneMode()
  const install = useInstallPrompt(isStandalone)
  const [guideOpen, setGuideOpen] = useState(false)
  const [dirtyForms, setDirtyForms] = useState<Set<string>>(() => new Set())
  const hasUnsavedChanges = dirtyForms.size > 0
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges)
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges
  }, [hasUnsavedChanges])
  const registration = usePwaRegistration(hasUnsavedChangesRef)
  const offlineReady =
    registration.offlineReady ||
    Boolean(registration.registration?.active) ||
    Boolean(navigator.serviceWorker?.controller)

  const openInstallGuide = useCallback(() => setGuideOpen(true), [])
  const closeInstallGuide = useCallback(() => setGuideOpen(false), [])
  const dismissInstallGuide = useCallback(() => {
    setInstallGuideDismissed()
    setGuideOpen(false)
  }, [])

  const setFormDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyForms((current) => {
      if ((dirty && current.has(id)) || (!dirty && !current.has(id))) return current
      const next = new Set(current)
      if (dirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  useEffect(() => {
    if (!hasUnsavedChanges) return
    const preventUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [hasUnsavedChanges])

  const value = useMemo<PwaContextValue>(
    () => ({
      isIos: isIosDevice(navigator),
      isOnline,
      isStandalone,
      isInstalled: install.isInstalled,
      installAvailable: install.installAvailable,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      offlineReady,
      needRefresh: registration.needRefresh,
      isUpdating: registration.isUpdating,
      updateError: registration.updateError,
      hasUnsavedChanges,
      guideOpen,
      requestInstall: install.requestInstall,
      openInstallGuide,
      closeInstallGuide,
      dismissInstallGuide,
      applyUpdate: registration.applyUpdate,
      checkForUpdate: registration.checkForUpdate,
      dismissUpdate: registration.dismissUpdate,
      clearUpdateError: registration.clearUpdateError,
      setFormDirty
    }),
    [
      closeInstallGuide,
      dismissInstallGuide,
      guideOpen,
      hasUnsavedChanges,
      install.installAvailable,
      install.isInstalled,
      install.requestInstall,
      isOnline,
      isStandalone,
      openInstallGuide,
      registration.applyUpdate,
      registration.checkForUpdate,
      registration.clearUpdateError,
      registration.dismissUpdate,
      registration.isUpdating,
      registration.needRefresh,
      offlineReady,
      registration.updateError,
      setFormDirty
    ]
  )

  return (
    <PwaContext.Provider value={value}>
      {children}
      <OfflineBanner />
      <InstallGuideDialog />
      <UpdatePrompt />
    </PwaContext.Provider>
  )
}
