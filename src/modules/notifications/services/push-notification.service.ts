import { supabase } from '@/shared/services/supabase'
import {
  clearLocalPushBinding,
  createPushBinding,
  getInstallationId,
  getLocalPushBinding,
  setLocalPushBinding
} from './push-installation.service'
import type { PushCleanupResult, PushNotificationStatus } from '../types/push-notification'

function requireClient() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

export function pushSupported(): boolean {
  return Boolean(
    import.meta.env.VITE_VAPID_PUBLIC_KEY &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const decoded = atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'))
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length))
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index)
  return bytes
}

function subscriptionKeys(subscription: PushSubscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('Pushsubscription saknar nödvändiga nycklar.')
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, authSecret: json.keys.auth }
}

async function registerSubscription(subscription: PushSubscription): Promise<void> {
  const binding = createPushBinding()
  const keys = subscriptionKeys(subscription)
  const { error } = await requireClient().rpc('push_register_subscription', {
    p_installation_id: binding.installationId,
    p_binding_id: binding.bindingId,
    p_endpoint: keys.endpoint,
    p_p256dh: keys.p256dh,
    p_auth_secret: keys.authSecret,
    p_browser_metadata: {
      userAgent: navigator.userAgent.slice(0, 512),
      standalone: window.matchMedia?.('(display-mode: standalone)').matches ?? false
    }
  })
  if (error) throw error
  await setLocalPushBinding(binding)
}

export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
  if (!pushSupported()) return 'unavailable'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted') return 'not_enabled'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return 'not_enabled'
  const local = getLocalPushBinding()
  if (!local) return 'not_enabled'
  const { data, error } = await requireClient()
    .from('push_subscriptions')
    .select('status,binding_id')
    .eq('installation_id', local.installationId)
    .maybeSingle()
  if (error) throw error
  return data?.status === 'active' && data.binding_id === local.bindingId
    ? 'enabled'
    : 'not_enabled'
}

export async function enablePushNotifications(): Promise<void> {
  if (!pushSupported()) throw new Error('Pushnotiser stöds inte på den här enheten.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Tillåtelse för pushnotiser saknas.')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(import.meta.env.VITE_VAPID_PUBLIC_KEY)
    }))
  await registerSubscription(subscription)
}

export async function rebindExistingPushSubscription(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return false
  await registerSubscription(subscription)
  return true
}

export async function unsubscribeCurrentPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  const registration = navigator.serviceWorker.getRegistration
    ? await navigator.serviceWorker.getRegistration()
    : await navigator.serviceWorker.ready
  if (!registration) return false
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? subscription.unsubscribe() : false
}

export async function deactivateCurrentInstallation(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.rpc('push_deactivate_installation', {
    p_installation_id: getInstallationId()
  })
  if (error) throw error
}

export async function disablePushNotifications(): Promise<PushCleanupResult> {
  await clearLocalPushBinding()
  const [localSubscription, serverSubscription] = await Promise.allSettled([
    unsubscribeCurrentPushSubscription(),
    deactivateCurrentInstallation()
  ])
  return { localSubscription, serverSubscription }
}

export function logSanitizedPushCleanupFailure(stage: string): void {
  console.warn('push cleanup failed', { stage, errorClass: 'push_cleanup_failed' })
}
