import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useCalendarScrollLock } from '../hooks/useCalendarScrollLock'

export function CalendarDialog({
  title,
  open,
  onClose,
  children
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useCalendarScrollLock(open)
  useEffect(() => {
    if (!open) return
    const initialFocus = dialogRef.current?.querySelector<HTMLElement>(
      '[data-calendar-dialog-initial-focus]'
    )
    const focusTarget = initialFocus ?? closeRef.current
    focusTarget?.focus()
  }, [open])
  if (!open) return null
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = [
      ...(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      ) ?? [])
    ]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <div
      className="calendar-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className="calendar-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-dialog-title"
        onKeyDown={handleKeyDown}
      >
        <header>
          <h2 id="calendar-dialog-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="Stäng"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
