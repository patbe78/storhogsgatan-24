import { Suspense, type ReactNode } from 'react'

export function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<section className="route-loading">Laddar…</section>}>{children}</Suspense>
  )
}
