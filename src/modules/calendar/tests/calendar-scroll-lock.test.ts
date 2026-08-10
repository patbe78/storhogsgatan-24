import { vi } from 'vitest'
import { acquireCalendarScrollLock } from '../hooks/useCalendarScrollLock'

describe('calendar scroll lock', () => {
  it('behåller låset tills sista overlay-token släpps oavsett cleanup-ordning', () => {
    const releaseDialog = acquireCalendarScrollLock()
    const releaseSheet = acquireCalendarScrollLock()

    releaseDialog()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body).toHaveClass('calendar-scroll-locked')

    releaseSheet()
    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.body).not.toHaveClass('calendar-scroll-locked')
    expect(document.documentElement).not.toHaveClass('calendar-scroll-locked')
  })

  it('återställer ursprungliga styles och scrollposition exakt', () => {
    document.body.style.overflow = 'auto'
    document.body.style.position = 'relative'
    document.body.style.top = '3px'
    document.body.style.width = '90%'
    document.documentElement.style.overflow = 'scroll'
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 12 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 })
    const scrollTo = vi.spyOn(window, 'scrollTo')

    const release = acquireCalendarScrollLock()
    expect(document.body.style.position).toBe('fixed')
    expect(document.body.style.top).toBe('-240px')
    release()
    release()

    expect(document.body.style.overflow).toBe('auto')
    expect(document.body.style.position).toBe('relative')
    expect(document.body.style.top).toBe('3px')
    expect(document.body.style.width).toBe('90%')
    expect(document.documentElement.style.overflow).toBe('scroll')
    expect(scrollTo).toHaveBeenCalledOnce()
    expect(scrollTo).toHaveBeenCalledWith(12, 240)

    document.body.removeAttribute('style')
    document.documentElement.removeAttribute('style')
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 0 })
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  })
})
