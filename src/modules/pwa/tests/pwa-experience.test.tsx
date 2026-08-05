import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OnboardingDialog } from '../components/OnboardingDialog'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import {
  isInstallGuideDismissed,
  isOnboardingComplete,
  setInstallGuideDismissed
} from '../services/pwa-storage'
import { isIosDevice, isStandaloneDisplay } from '../utils/platform'
import type { BeforeInstallPromptEvent } from '../types/pwa'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('installation', () => {
  it('fångar beforeinstallprompt och använder webbläsarens prompt en gång', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent
    Object.assign(event, {
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
    })
    const { result } = renderHook(() => useInstallPrompt(false))

    act(() => window.dispatchEvent(event))
    expect(result.current.installAvailable).toBe(true)

    await act(() => result.current.requestInstall())

    expect(prompt).toHaveBeenCalledOnce()
    expect(result.current.isInstalled).toBe(true)
    expect(result.current.installAvailable).toBe(false)
    await expect(result.current.requestInstall()).resolves.toBe('unavailable')
  })

  it('identifierar iPhone, touch-iPad och standalone-läge', () => {
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone)' })).toBe(true)
    expect(isIosDevice({ userAgent: 'Macintosh', maxTouchPoints: 5 })).toBe(true)
    expect(isIosDevice({ userAgent: 'Mozilla/5.0 (Linux; Android 15)' })).toBe(false)
    expect(isStandaloneDisplay({}, true)).toBe(true)
    expect(isStandaloneDisplay({ standalone: true }, false)).toBe(true)
  })

  it('lagrar endast diskreta PWA-flaggor, inte formulärdata', () => {
    setInstallGuideDismissed()
    expect(isInstallGuideDismissed()).toBe(true)
    expect(Object.keys(localStorage)).toEqual(['storhogsgatan:pwa:install-guide-dismissed:v1'])
    expect(localStorage.getItem('storhogsgatan:pwa:install-guide-dismissed:v1')).toBe('1')
  })
})

describe('onboarding', () => {
  it('visas en gång och markeras klar efter sista steget', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<OnboardingDialog />)

    expect(screen.getByRole('heading', { name: 'Se familjens kalender' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Fortsätt' }))
    expect(screen.getByRole('heading', { name: 'Skapa aktiviteter' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Fortsätt' }))
    expect(screen.getByRole('heading', { name: 'Installera appen' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Klar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(isOnboardingComplete()).toBe(true)

    unmount()
    render(<OnboardingDialog />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
