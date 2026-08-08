import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCalendarNavigation } from '../hooks/useCalendarNavigation'
import { toDateKey } from '../utils/calendar-dates'

describe('kalenderns push-djuplänk', () => {
  it('positionerar kalendern på länkat datum', () => {
    const { result } = renderHook(() => useCalendarNavigation('2026-11-18'))
    expect(toDateKey(result.current.anchor)).toBe('2026-11-18')
  })

  it('ignorerar ogiltiga datum', () => {
    const { result } = renderHook(() => useCalendarNavigation('inte-ett-datum'))
    expect(Number.isNaN(result.current.anchor.getTime())).toBe(false)
  })
})
