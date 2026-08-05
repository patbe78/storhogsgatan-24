import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

interface RoutingApi {
  basePath: string
  redirectFrom404: () => boolean
  restoreRoute: (now: number) => boolean
}

function createHarness(initialUrl: string, storageWorks = true) {
  const values = new Map<string, string>()
  let current = new URL(initialUrl)
  const locationReplace = vi.fn((target: string) => {
    current = new URL(target, current.origin)
  })
  const historyReplace = vi.fn((_state: unknown, _title: string, target: string) => {
    current = new URL(target, current.origin)
  })
  const browser = {
    get location() {
      return {
        href: current.href,
        pathname: current.pathname,
        search: current.search,
        hash: current.hash,
        replace: locationReplace
      }
    },
    history: { replaceState: historyReplace },
    sessionStorage: {
      getItem(key: string) {
        if (!storageWorks) throw new Error('Storage unavailable')
        return values.get(key) ?? null
      },
      setItem(key: string, value: string) {
        if (!storageWorks) throw new Error('Storage unavailable')
        values.set(key, value)
      },
      removeItem(key: string) {
        if (!storageWorks) throw new Error('Storage unavailable')
        values.delete(key)
      }
    },
    StorhogsgatanPagesRouting: undefined as RoutingApi | undefined
  }

  const source = readFileSync(join(process.cwd(), 'public/github-pages-routing.js'), 'utf8')
  new Function('window', source)(browser)

  return {
    api: browser.StorhogsgatanPagesRouting!,
    currentUrl: () => current,
    navigate: (target: string) => {
      current = new URL(target, current.origin)
    },
    locationReplace,
    historyReplace
  }
}

describe('GitHub Pages 404 routing', () => {
  it.each([
    [
      'kalender',
      'https://example.test/storhogsgatan-24/kalender?view=month&event=abc%201#dag',
      '/storhogsgatan-24/kalender?view=month&event=abc%201#dag'
    ],
    [
      'inställningar',
      'https://example.test/storhogsgatan-24/installningar?panel=app#installation',
      '/storhogsgatan-24/installningar?panel=app#installation'
    ]
  ])('återställer direkt navigation till %s under Pages-basen', (_name, directUrl, expected) => {
    const harness = createHarness(directUrl)

    expect(harness.api.basePath).toBe('/storhogsgatan-24/')
    expect(harness.api.redirectFrom404()).toBe(true)
    expect(harness.locationReplace).toHaveBeenCalledOnce()
    expect(harness.locationReplace).toHaveBeenLastCalledWith('/storhogsgatan-24/?spa-redirect=1')

    harness.navigate('https://example.test/storhogsgatan-24/?spa-redirect=1')
    expect(harness.api.restoreRoute(Date.now())).toBe(true)
    expect(harness.historyReplace).toHaveBeenLastCalledWith(null, '', expected)
    expect(
      harness.currentUrl().pathname + harness.currentUrl().search + harness.currentUrl().hash
    ).toBe(expected)

    expect(harness.api.restoreRoute(Date.now())).toBe(false)
    expect(harness.locationReplace).toHaveBeenCalledOnce()
  })

  it('bevarar routen även när sessionStorage inte är tillgängligt', () => {
    const harness = createHarness(
      'https://example.test/storhogsgatan-24/installningar?panel=app#offline',
      false
    )

    expect(harness.api.redirectFrom404()).toBe(true)
    const fallbackUrl = harness.currentUrl()
    expect(fallbackUrl.pathname).toBe('/storhogsgatan-24/')
    expect(fallbackUrl.searchParams.has('spa-route')).toBe(true)

    expect(harness.api.restoreRoute(Date.now())).toBe(true)
    expect(
      harness.currentUrl().pathname + harness.currentUrl().search + harness.currentUrl().hash
    ).toBe('/storhogsgatan-24/installningar?panel=app#offline')
  })

  it('omdirigerar inte saknade assets eller vägar utanför basen', () => {
    const asset = createHarness('https://example.test/storhogsgatan-24/assets/index-deadbeef.js')
    expect(asset.api.redirectFrom404()).toBe(false)
    expect(asset.locationReplace).not.toHaveBeenCalled()

    const outside = createHarness('https://example.test/kalender')
    expect(outside.api.redirectFrom404()).toBe(false)
    expect(outside.locationReplace).not.toHaveBeenCalled()
  })
})
