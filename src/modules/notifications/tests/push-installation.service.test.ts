import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLocalPushBinding,
  createPushBinding,
  getInstallationId,
  getLocalPushBinding,
  setLocalPushBinding
} from '../services/push-installation.service'

const postMessage = vi.fn()

beforeEach(() => {
  localStorage.clear()
  postMessage.mockReset()
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve({ active: { postMessage } }), controller: null }
  })
})

describe('installationens pushbinding', () => {
  it('behåller installation-id men roterar binding-id', () => {
    const first = createPushBinding()
    const second = createPushBinding()
    expect(second.installationId).toBe(first.installationId)
    expect(second.bindingId).not.toBe(first.bindingId)
    expect(getInstallationId()).toBe(first.installationId)
  })

  it('rensar lokal binding före service worker-meddelandet', async () => {
    const binding = createPushBinding()
    await setLocalPushBinding(binding)
    expect(getLocalPushBinding()).toEqual(binding)
    await clearLocalPushBinding()
    expect(getLocalPushBinding()).toBeNull()
    expect(postMessage).toHaveBeenLastCalledWith({ type: 'PUSH_BINDING_CLEAR' })
  })
})
