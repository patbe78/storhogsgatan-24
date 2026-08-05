import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { CalendarSwipeSurface } from '../components/CalendarSwipeSurface'

describe('CalendarSwipeSurface', () => {
  it('byter period vid tydlig horisontell touch', () => {
    const onSwipe = vi.fn()
    render(
      <CalendarSwipeSurface enabled onSwipe={onSwipe}>
        <span>Kalender</span>
      </CalendarSwipeSurface>
    )
    const surface = screen.getByText('Kalender').parentElement!
    fireEvent.pointerDown(surface, { pointerType: 'touch', clientX: 100, clientY: 20 })
    fireEvent.pointerUp(surface, { pointerType: 'touch', clientX: 20, clientY: 22 })
    expect(onSwipe).toHaveBeenCalledWith(1)
  })
  it('ignorerar vertikal scroll', () => {
    const onSwipe = vi.fn()
    render(
      <CalendarSwipeSurface enabled onSwipe={onSwipe}>
        <span>Kalender</span>
      </CalendarSwipeSurface>
    )
    const surface = screen.getByText('Kalender').parentElement!
    fireEvent.pointerDown(surface, { pointerType: 'touch', clientX: 50, clientY: 10 })
    fireEvent.pointerUp(surface, { pointerType: 'touch', clientX: 60, clientY: 100 })
    expect(onSwipe).not.toHaveBeenCalled()
  })
})
