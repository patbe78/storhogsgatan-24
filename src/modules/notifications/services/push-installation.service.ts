import type { PushBinding } from '../types/push-notification'

const INSTALLATION_KEY = 'storhogsgatan:push:installation:v1'
const BINDING_KEY = 'storhogsgatan:push:binding:v1'

function uuid(): string {
  return crypto.randomUUID()
}

export function getInstallationId(): string {
  const existing = localStorage.getItem(INSTALLATION_KEY)
  if (existing) return existing
  const created = uuid()
  localStorage.setItem(INSTALLATION_KEY, created)
  return created
}

export function createPushBinding(): PushBinding {
  return { installationId: getInstallationId(), bindingId: uuid() }
}

export function getLocalPushBinding(): PushBinding | null {
  const raw = localStorage.getItem(BINDING_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PushBinding
    return parsed.installationId && parsed.bindingId ? parsed : null
  } catch {
    return null
  }
}

async function postBindingMessage(message: Record<string, unknown>): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = navigator.serviceWorker.getRegistration
    ? await navigator.serviceWorker.getRegistration()
    : await navigator.serviceWorker.ready
  if (!registration) return
  const worker = registration.active ?? navigator.serviceWorker.controller
  worker?.postMessage(message)
}

export async function setLocalPushBinding(binding: PushBinding): Promise<void> {
  localStorage.setItem(BINDING_KEY, JSON.stringify(binding))
  await postBindingMessage({ type: 'PUSH_BINDING_SET', bindingId: binding.bindingId })
}

export async function clearLocalPushBinding(): Promise<void> {
  localStorage.removeItem(BINDING_KEY)
  await postBindingMessage({ type: 'PUSH_BINDING_CLEAR' })
}
