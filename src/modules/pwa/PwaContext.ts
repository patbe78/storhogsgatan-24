import { createContext, useContext } from 'react'
import type { PwaContextValue } from './types/pwa'

export const PwaContext = createContext<PwaContextValue | null>(null)

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext)
  if (!context) throw new Error('usePwa måste användas inom PwaProvider')
  return context
}

export function useOptionalPwa(): PwaContextValue | null {
  return useContext(PwaContext)
}
