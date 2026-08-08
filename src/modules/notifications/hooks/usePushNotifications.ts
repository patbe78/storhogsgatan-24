import { useCallback, useEffect, useState } from 'react'
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushNotificationStatus
} from '../services/push-notification.service'
import type { PushNotificationStatus } from '../types/push-notification'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>('not_enabled')
  const [informationOpen, setInformationOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPushNotificationStatus())
    } catch {
      setStatus('not_enabled')
      setError('Pushstatus kunde inte hämtas.')
    }
  }, [])

  useEffect(() => {
    let active = true
    void getPushNotificationStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus)
      })
      .catch(() => {
        if (active) {
          setStatus('not_enabled')
          setError('Pushstatus kunde inte hämtas.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  async function confirmEnable() {
    setInformationOpen(false)
    setBusy(true)
    setError('')
    try {
      await enablePushNotifications()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pushnotiser kunde inte aktiveras.')
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  async function disable() {
    setBusy(true)
    setError('')
    try {
      const result = await disablePushNotifications()
      if (
        result.localSubscription.status === 'rejected' ||
        result.serverSubscription.status === 'rejected'
      )
        setError('Enheten kunde inte avregistreras fullständigt. Försök igen.')
    } catch {
      setError('Enheten kunde inte avregistreras fullständigt. Försök igen.')
    } finally {
      setBusy(false)
      await refresh()
    }
  }

  return {
    status,
    informationOpen,
    busy,
    error,
    openInformation: () => setInformationOpen(true),
    closeInformation: () => setInformationOpen(false),
    confirmEnable,
    disable
  }
}
