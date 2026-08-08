import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  authCallback: undefined as undefined | ((event: string, session: Session | null) => void),
  clearBinding: vi.fn(),
  unsubscribe: vi.fn(),
  deactivate: vi.fn(),
  rebind: vi.fn(),
  sanitizedLog: vi.fn()
}))

vi.mock('@/shared/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        mocks.authCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }
    }
  }
}))

vi.mock('@/modules/notifications', () => ({
  clearLocalPushBinding: mocks.clearBinding,
  deactivateCurrentInstallation: mocks.deactivate,
  logSanitizedPushCleanupFailure: mocks.sanitizedLog,
  rebindExistingPushSubscription: mocks.rebind,
  unsubscribeCurrentPushSubscription: mocks.unsubscribe
}))

vi.mock('@/modules/pwa', () => ({
  AppIcon: () => null,
  InstallAppButton: () => null,
  useUnsavedChanges: vi.fn()
}))

import { AuthProvider, useAuth } from '../index'

const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'user-1' }
} as Session

function Harness() {
  const auth = useAuth()
  return (
    <button type="button" onClick={() => void auth.signOut()}>
      Testlogga ut
    </button>
  )
}

beforeEach(() => {
  mocks.getSession.mockReset().mockResolvedValue({ data: { session: null } })
  mocks.signOut.mockReset().mockResolvedValue({ error: null })
  mocks.clearBinding.mockReset().mockResolvedValue(undefined)
  mocks.unsubscribe.mockReset().mockResolvedValue(true)
  mocks.deactivate.mockReset().mockResolvedValue(undefined)
  mocks.rebind.mockReset().mockResolvedValue(true)
  mocks.sanitizedLog.mockReset()
  mocks.authCallback = undefined
})

describe('push och auth-sessionens livscykel', () => {
  it('fullföljer signOut trots alla cleanupfel och loggar endast sanerade steg', async () => {
    mocks.clearBinding.mockRejectedValue(new Error('endpoint=https://hemlig.invalid'))
    mocks.unsubscribe.mockRejectedValue(new Error('p256dh=hemlig'))
    mocks.deactivate.mockRejectedValue(new Error('auth=hemlig'))
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Testlogga ut' }))
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce())
    expect(mocks.sanitizedLog.mock.calls).toEqual([
      ['local_binding'],
      ['local_unsubscribe'],
      ['server_deactivate']
    ])
    expect(JSON.stringify(mocks.sanitizedLog.mock.calls)).not.toContain('hemlig')
    expect(mocks.clearBinding.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.unsubscribe.mock.invocationCallOrder[0]
    )
  })

  it('fullföljer signOut när lokal binding-cleanup aldrig svarar', async () => {
    vi.useFakeTimers()
    mocks.clearBinding.mockReturnValue(new Promise(() => undefined))
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Testlogga ut' }))
    await act(async () => vi.advanceTimersByTimeAsync(3001))

    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.sanitizedLog).toHaveBeenCalledWith('local_binding')
    vi.useRealTimers()
  })

  it('återbinder befintlig subscription vid användarbyte utan permissiondialog', async () => {
    const requestPermission = vi.fn()
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { requestPermission }
    })
    render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    )
    await waitFor(() => expect(mocks.authCallback).toBeTypeOf('function'))
    act(() => mocks.authCallback?.('SIGNED_IN', session))
    await waitFor(() => expect(mocks.rebind).toHaveBeenCalledOnce())
    expect(requestPermission).not.toHaveBeenCalled()
  })
})
