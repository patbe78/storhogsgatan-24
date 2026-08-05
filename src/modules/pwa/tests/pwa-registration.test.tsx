import { act, render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PwaProvider } from '../PwaProvider'
import { usePwaRegistration } from '../hooks/usePwaRegistration'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import { markRecentUpdate } from '../services/pwa-storage'

const sw = vi.hoisted(() => ({
  needRefresh: true,
  offlineReady: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(),
  options: undefined as
    | undefined
    | {
        onNeedReload?: () => void
        onRegisterError?: () => void
      }
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options: typeof sw.options) => {
    sw.options = options
    return {
      needRefresh: [sw.needRefresh, sw.setNeedRefresh],
      offlineReady: [sw.offlineReady, vi.fn()],
      updateServiceWorker: sw.updateServiceWorker
    }
  }
}))

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  sw.needRefresh = true
  sw.offlineReady = false
  sw.setNeedRefresh.mockReset()
  sw.updateServiceWorker.mockReset()
  sw.options = undefined
})

describe('kontrollerad service worker-uppdatering', () => {
  it('förhindrar dubbla uppdateringsanrop', async () => {
    sw.updateServiceWorker.mockResolvedValue(undefined)
    const dirty = { current: false }
    const { result, unmount } = renderHook(() => usePwaRegistration(dirty))

    await act(async () => {
      await Promise.all([result.current.applyUpdate(), result.current.applyUpdate()])
    })

    expect(sw.updateServiceWorker).toHaveBeenCalledOnce()
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true)
    unmount()
  })

  it('startar inte en uppdatering medan ett formulär är smutsigt', async () => {
    const dirty = { current: true }
    const { result } = renderHook(() => usePwaRegistration(dirty))

    await act(() => result.current.applyUpdate())

    expect(sw.updateServiceWorker).not.toHaveBeenCalled()
  })

  it('visar fel utan att försöka ladda om automatiskt', async () => {
    sw.updateServiceWorker.mockRejectedValue(new Error('update failed'))
    const dirty = { current: false }
    const { result } = renderHook(() => usePwaRegistration(dirty))

    await act(() => result.current.applyUpdate())

    expect(result.current.isUpdating).toBe(false)
    expect(result.current.updateError).toBe('Uppdateringen kunde inte slutföras. Försök igen.')
    expect(sessionStorage.getItem('storhogsgatan:pwa:recent-update:v1')).toBeNull()
  })

  it('skjuter upp omladdning om ett formulär blir smutsigt under uppdateringen', () => {
    const dirty = { current: true }
    const { result } = renderHook(() => usePwaRegistration(dirty))

    act(() => sw.options?.onNeedReload?.())

    expect(result.current.isUpdating).toBe(false)
    expect(result.current.updateError).toBe(
      'Spara eller avbryt formuläret innan uppdateringen slutförs.'
    )
    expect(sessionStorage.getItem('storhogsgatan:pwa:recent-update:v1')).toBeNull()
  })

  it('döljer en återkommande prompt direkt efter lyckad uppdatering', async () => {
    markRecentUpdate()
    renderHook(() => usePwaRegistration({ current: false }))

    await waitFor(() => expect(sw.setNeedRefresh).toHaveBeenCalledWith(false))
  })
})

function DirtyForm({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty)
  return null
}

function DirtyHarness({ dirty }: { dirty: boolean }) {
  return <DirtyForm dirty={dirty} />
}

describe('osparade formulär', () => {
  it('tar bort beforeunload så snart inga formulär är smutsiga', async () => {
    const { rerender } = render(
      <PwaProvider>
        <DirtyHarness dirty />
      </PwaProvider>
    )

    await waitFor(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })

    rerender(
      <PwaProvider>
        <DirtyHarness dirty={false} />
      </PwaProvider>
    )

    await waitFor(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })
  })
})
