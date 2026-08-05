import { isInteractiveSwipeTarget, swipeDirection } from '../utils/calendar-gestures'

describe('calendar swipe', () => {
  it('tolkar vänster/höger', () => {
    expect(swipeDirection({ x: 100, y: 10 }, { x: 20, y: 12 })).toBe(1)
    expect(swipeDirection({ x: 20, y: 10 }, { x: 100, y: 12 })).toBe(-1)
  })
  it('ignorerar kort eller vertikal rörelse', () => {
    expect(swipeDirection({ x: 10, y: 10 }, { x: 30, y: 10 })).toBeNull()
    expect(swipeDirection({ x: 10, y: 10 }, { x: 70, y: 100 })).toBeNull()
  })
  it('startar inte svepning från interaktiva kontroller eller dialoger', () => {
    document.body.innerHTML =
      '<div role="dialog"><button><span id="target">Val</span></button></div>'
    expect(isInteractiveSwipeTarget(document.querySelector('#target'))).toBe(true)
    expect(isInteractiveSwipeTarget(document.body)).toBe(false)
  })
})
