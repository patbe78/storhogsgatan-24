export interface SwipePoint {
  x: number
  y: number
}

export function swipeDirection(start: SwipePoint, end: SwipePoint, threshold = 48): -1 | 1 | null {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return Math.abs(dx) >= threshold && Math.abs(dx) >= Math.abs(dy) * 1.25 ? (dx < 0 ? 1 : -1) : null
}

export function isInteractiveSwipeTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, a, input, select, textarea, [role="dialog"], [data-no-swipe]'))
  )
}
