import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentProfile } from '@/shared/services/profile'
import type { Profile } from '@/shared/types/profile'

export function MembershipGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let mounted = true
    void getCurrentProfile()
      .then((value) => {
        if (mounted) setProfile(value)
      })
      .catch(() => {
        if (mounted) setProfile(null)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])
  if (loading) return <div className="centered">Laddar…</div>
  if (profile && !profile.is_active) {
    return (
      <section className="membership-inactive" role="alert">
        <h1>Ditt medlemskap i hushållet är avaktiverat.</h1>
        <p>Kontakta en administratör.</p>
      </section>
    )
  }
  return children
}
