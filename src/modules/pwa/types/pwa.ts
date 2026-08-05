export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaContextValue {
  isIos: boolean
  isOnline: boolean
  isStandalone: boolean
  isInstalled: boolean
  installAvailable: boolean
  serviceWorkerSupported: boolean
  offlineReady: boolean
  needRefresh: boolean
  isUpdating: boolean
  updateError: string | null
  hasUnsavedChanges: boolean
  guideOpen: boolean
  requestInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  openInstallGuide: () => void
  closeInstallGuide: () => void
  dismissInstallGuide: () => void
  applyUpdate: () => Promise<void>
  checkForUpdate: () => Promise<void>
  dismissUpdate: () => void
  clearUpdateError: () => void
  setFormDirty: (id: string, dirty: boolean) => void
}
