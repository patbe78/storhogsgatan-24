import { useEffect, useId } from 'react'
import { useOptionalPwa } from '../PwaContext'

export function useUnsavedChanges(dirty: boolean): void {
  const id = useId()
  const setFormDirty = useOptionalPwa()?.setFormDirty

  useEffect(() => {
    setFormDirty?.(id, dirty)
    return () => setFormDirty?.(id, false)
  }, [dirty, id, setFormDirty])
}
