import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function CalendarPickerSheet({
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
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null
  return (
    <div
      className="calendar-picker-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="calendar-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
        }}
      >
        <header>
          <h3 id={titleId}>{title}</h3>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="Stäng"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="calendar-picker-sheet__content">{children}</div>
      </section>
    </div>
  )
}
