export type PushNotificationStatus = 'enabled' | 'not_enabled' | 'blocked' | 'unavailable'

export interface PushBinding {
  installationId: string
  bindingId: string
}

export interface PushCleanupResult {
  localSubscription: PromiseSettledResult<boolean>
  serverSubscription: PromiseSettledResult<void>
}
