import { useEffect, useState } from 'react'
import { getCurrentProfile } from '@/shared/services/profile'
import type { Profile } from '@/shared/types/profile'

export function useCurrentProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let active = true

    void getCurrentProfile()
      .then((currentProfile) => {
        if (active) setProfile(currentProfile)
      })
      .catch(() => {
        if (active) setProfile(null)
      })

    return () => {
      active = false
    }
  }, [])

  return profile
}
