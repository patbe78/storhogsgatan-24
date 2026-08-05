import { useEffect, useState } from 'react'
import type { BeforeInstallPromptEvent } from '../types/pwa'

export function useInstallPrompt(isStandalone: boolean) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const capturePrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function requestInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!promptEvent || installed || isStandalone) return 'unavailable'
    const currentPrompt = promptEvent
    setPromptEvent(null)
    await currentPrompt.prompt()
    const choice = await currentPrompt.userChoice
    if (choice.outcome === 'accepted') setInstalled(true)
    return choice.outcome
  }

  return {
    isInstalled: installed || isStandalone,
    installAvailable: Boolean(promptEvent) && !installed && !isStandalone,
    requestInstall
  }
}
