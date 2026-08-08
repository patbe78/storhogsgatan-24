import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PushNotificationPanel } from '../components/PushNotificationPanel'

const mocks = vi.hoisted(() => ({
  status: 'not_enabled' as 'enabled' | 'not_enabled' | 'blocked' | 'unavailable',
  enable: vi.fn(),
  disable: vi.fn()
}))

vi.mock('../services/push-notification.service', () => ({
  getPushNotificationStatus: vi.fn(() => Promise.resolve(mocks.status)),
  enablePushNotifications: mocks.enable,
  disablePushNotifications: mocks.disable
}))

beforeEach(() => {
  mocks.status = 'not_enabled'
  mocks.enable.mockReset().mockResolvedValue(undefined)
  mocks.disable.mockReset().mockResolvedValue({
    localSubscription: { status: 'fulfilled', value: true },
    serverSubscription: { status: 'fulfilled', value: undefined }
  })
})

describe('pushinställningar', () => {
  it('visar information innan browserpermission begärs', async () => {
    const user = userEvent.setup()
    render(<PushNotificationPanel />)
    await screen.findByText('Inte aktiverade')
    expect(mocks.enable).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Aktivera pushnotiser' }))
    expect(screen.getByRole('dialog', { name: 'Aktivera kalenderpåminnelser' })).toBeVisible()
    expect(mocks.enable).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Fortsätt' }))
    await waitFor(() => expect(mocks.enable).toHaveBeenCalledOnce())
  })

  it.each([
    ['blocked', 'Blockerade'],
    ['unavailable', 'Ej tillgängligt på denna enhet']
  ] as const)('visar status %s', async (status, label) => {
    mocks.status = status
    render(<PushNotificationPanel />)
    expect(await screen.findByText(label)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Aktivera pushnotiser' })).toBeDisabled()
  })
})
