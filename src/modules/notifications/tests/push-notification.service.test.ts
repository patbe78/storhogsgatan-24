import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  postMessage: vi.fn(),
  requestPermission: vi.fn(),
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
}))

vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
      }))
    }))
  }
}))

import {
  disablePushNotifications,
  enablePushNotifications,
  rebindExistingPushSubscription
} from '../services/push-notification.service'

const subscription = {
  toJSON: () => ({
    endpoint: 'https://push.test/device-endpoint',
    keys: { p256dh: 'public-encryption-key', auth: 'auth-secret-key' }
  }),
  unsubscribe: mocks.unsubscribe
} as unknown as PushSubscription

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQAB')
  mocks.rpc.mockReset().mockResolvedValue({ data: 'subscription-id', error: null })
  mocks.postMessage.mockReset()
  mocks.requestPermission.mockReset().mockResolvedValue('granted')
  mocks.getSubscription.mockReset().mockResolvedValue(subscription)
  mocks.subscribe.mockReset().mockResolvedValue(subscription)
  mocks.unsubscribe.mockReset().mockResolvedValue(true)
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} })
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission: 'granted', requestPermission: mocks.requestPermission }
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        active: { postMessage: mocks.postMessage },
        pushManager: { getSubscription: mocks.getSubscription, subscribe: mocks.subscribe }
      }),
      controller: null
    }
  })
})

describe('pushsubscription service', () => {
  it('återbinder befintlig browser-subscription atomärt utan permissiondialog', async () => {
    await expect(rebindExistingPushSubscription()).resolves.toBe(true)
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    expect(mocks.subscribe).not.toHaveBeenCalled()
    expect(mocks.rpc).toHaveBeenCalledWith(
      'push_register_subscription',
      expect.objectContaining({
        p_endpoint: 'https://push.test/device-endpoint',
        p_p256dh: 'public-encryption-key',
        p_auth_secret: 'auth-secret-key'
      })
    )
    expect(mocks.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PUSH_BINDING_SET' })
    )
  })

  it('begär permission först när aktiveringsfunktionen anropas', async () => {
    expect(mocks.requestPermission).not.toHaveBeenCalled()
    await enablePushNotifications()
    expect(mocks.requestPermission).toHaveBeenCalledOnce()
  })

  it('isolerar lokal unsubscribe från misslyckad servercleanup', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('serverfel') })
    const result = await disablePushNotifications()
    expect(result.localSubscription.status).toBe('fulfilled')
    expect(result.serverSubscription.status).toBe('rejected')
  })
})
