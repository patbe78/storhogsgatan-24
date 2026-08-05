const INSTALL_GUIDE_DISMISSED_KEY = 'storhogsgatan:pwa:install-guide-dismissed:v1'
const ONBOARDING_COMPLETE_KEY = 'storhogsgatan:pwa:onboarding-complete:v1'
const RECENT_UPDATE_KEY = 'storhogsgatan:pwa:recent-update:v1'
const RECENT_UPDATE_WINDOW_MS = 2 * 60 * 1000

function getStorage(type: 'local' | 'session'): Storage | null {
  try {
    return type === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function isInstallGuideDismissed(): boolean {
  return getStorage('local')?.getItem(INSTALL_GUIDE_DISMISSED_KEY) === '1'
}

export function setInstallGuideDismissed(): void {
  getStorage('local')?.setItem(INSTALL_GUIDE_DISMISSED_KEY, '1')
}

export function isOnboardingComplete(): boolean {
  return getStorage('local')?.getItem(ONBOARDING_COMPLETE_KEY) === '1'
}

export function setOnboardingComplete(): void {
  getStorage('local')?.setItem(ONBOARDING_COMPLETE_KEY, '1')
}

export function markRecentUpdate(now = Date.now()): void {
  getStorage('session')?.setItem(RECENT_UPDATE_KEY, String(now))
}

export function wasRecentlyUpdated(now = Date.now()): boolean {
  const raw = getStorage('session')?.getItem(RECENT_UPDATE_KEY)
  if (!raw) return false
  const timestamp = Number(raw)
  return (
    Number.isFinite(timestamp) && now - timestamp >= 0 && now - timestamp < RECENT_UPDATE_WINDOW_MS
  )
}
