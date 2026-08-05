import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from '../utils/platform'

type IosNavigator = Navigator & { standalone?: boolean }

export function useStandaloneMode(): boolean {
  const query = '(display-mode: standalone)'
  const read = () =>
    isStandaloneDisplay(navigator as IosNavigator, window.matchMedia(query).matches)
  const [standalone, setStandalone] = useState(read)

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setStandalone(read())
    media.addEventListener('change', update)
    window.addEventListener('appinstalled', update)
    return () => {
      media.removeEventListener('change', update)
      window.removeEventListener('appinstalled', update)
    }
  }, [])

  return standalone
}
