import { useEffect } from 'react'

const SCROLL_LOCK_CLASS = 'calendar-scroll-locked'

interface ScrollLockSnapshot {
  bodyOverflow: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  htmlOverflow: string
  bodyHadClass: boolean
  htmlHadClass: boolean
  scrollX: number
  scrollY: number
}

const activeLocks = new Set<symbol>()
let snapshot: ScrollLockSnapshot | null = null

function lockPageScroll() {
  const body = document.body
  const html = document.documentElement
  snapshot = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    htmlOverflow: html.style.overflow,
    bodyHadClass: body.classList.contains(SCROLL_LOCK_CLASS),
    htmlHadClass: html.classList.contains(SCROLL_LOCK_CLASS),
    scrollX: window.scrollX,
    scrollY: window.scrollY
  }

  html.classList.add(SCROLL_LOCK_CLASS)
  body.classList.add(SCROLL_LOCK_CLASS)
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${snapshot.scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
}

function unlockPageScroll() {
  if (!snapshot) return
  const body = document.body
  const html = document.documentElement
  const previous = snapshot
  snapshot = null

  body.style.overflow = previous.bodyOverflow
  body.style.position = previous.bodyPosition
  body.style.top = previous.bodyTop
  body.style.left = previous.bodyLeft
  body.style.right = previous.bodyRight
  body.style.width = previous.bodyWidth
  html.style.overflow = previous.htmlOverflow
  if (!previous.bodyHadClass) body.classList.remove(SCROLL_LOCK_CLASS)
  if (!previous.htmlHadClass) html.classList.remove(SCROLL_LOCK_CLASS)
  window.scrollTo(previous.scrollX, previous.scrollY)
}

export function acquireCalendarScrollLock(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return () => undefined
  const token = Symbol('calendar-scroll-lock')
  if (activeLocks.size === 0) lockPageScroll()
  activeLocks.add(token)
  let released = false

  return () => {
    if (released) return
    released = true
    activeLocks.delete(token)
    if (activeLocks.size === 0) unlockPageScroll()
  }
}

export function useCalendarScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    return acquireCalendarScrollLock()
  }, [locked])
}
