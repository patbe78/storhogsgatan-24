import { useEffect, useRef, useState, type RefObject } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { markRecentUpdate, wasRecentlyUpdated } from '../services/pwa-storage'

const UPDATE_TIMEOUT_MS = 15000

export function usePwaRegistration(hasUnsavedChanges: RefObject<boolean>) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const updatingRef = useRef(false)
  const updateTimeoutRef = useRef<number | undefined>(undefined)

  function clearUpdateTimeout() {
    if (updateTimeoutRef.current) window.clearTimeout(updateTimeoutRef.current)
    updateTimeoutRef.current = undefined
  }

  function reloadWithUpdatedWorker() {
    if (updatingRef.current) return
    updatingRef.current = true
    setIsUpdating(true)
    setUpdateError(null)
    markRecentUpdate()
    window.location.reload()
  }

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_scriptUrl, nextRegistration) => setRegistration(nextRegistration),
    onRegisterError: () => setUpdateError('Offline-stödet kunde inte startas.'),
    onNeedReload: () => {
      clearUpdateTimeout()
      updatingRef.current = false
      setIsUpdating(false)
      setUpdateReady(true)
      if (hasUnsavedChanges.current) {
        setUpdateError('Spara eller avbryt formuläret innan uppdateringen slutförs.')
        return
      }
      reloadWithUpdatedWorker()
    }
  })

  useEffect(() => {
    if (needRefresh && wasRecentlyUpdated()) setNeedRefresh(false)
  }, [needRefresh, setNeedRefresh])

  useEffect(() => () => clearUpdateTimeout(), [])

  async function applyUpdate(): Promise<void> {
    if (updatingRef.current || hasUnsavedChanges.current) return
    if (updateReady) {
      reloadWithUpdatedWorker()
      return
    }

    updatingRef.current = true
    setIsUpdating(true)
    setUpdateError(null)
    try {
      await updateServiceWorker(true)
      updateTimeoutRef.current = window.setTimeout(() => {
        updatingRef.current = false
        setIsUpdating(false)
        setUpdateError('Uppdateringen kunde inte slutföras. Försök igen.')
      }, UPDATE_TIMEOUT_MS)
    } catch {
      updatingRef.current = false
      setIsUpdating(false)
      setUpdateError('Uppdateringen kunde inte slutföras. Försök igen.')
    }
  }

  async function checkForUpdate(): Promise<void> {
    if (!registration || updatingRef.current) return
    setUpdateError(null)
    try {
      await registration.update()
    } catch {
      setUpdateError('Det gick inte att söka efter en ny version.')
    }
  }

  return {
    registration,
    needRefresh,
    offlineReady,
    isUpdating,
    updateError,
    applyUpdate,
    checkForUpdate,
    dismissUpdate: () => setNeedRefresh(false),
    clearUpdateError: () => setUpdateError(null)
  }
}
