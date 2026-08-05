import { useLayoutEffect, useRef } from 'react'

export function useAutoResizeTextarea(value: string, maxHeight = 180) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = ref.current
    if (!textarea) return

    textarea.style.height = 'auto'
    if (!textarea.scrollHeight) return

    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [maxHeight, value])

  return ref
}
