import { useRef, type PointerEvent } from 'react'
import {
  isInteractiveSwipeTarget,
  swipeDirection,
  type SwipePoint
} from '../utils/calendar-gestures'

export function useCalendarSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<SwipePoint | null>(null)
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.pointerType !== 'touch' || isInteractiveSwipeTarget(event.target)) return
      start.current = { x: event.clientX, y: event.clientY }
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (!start.current) return
      const direction = swipeDirection(start.current, { x: event.clientX, y: event.clientY })
      start.current = null
      if (direction) onSwipe(direction)
    },
    onPointerCancel() {
      start.current = null
    }
  }
}
