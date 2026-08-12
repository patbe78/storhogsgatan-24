import type { DashboardProfile } from '../types/dashboard'

export function isAdultLikeProfile(profile: Pick<DashboardProfile, 'role'>): boolean {
  return profile.role === 'admin' || profile.role === 'adult'
}

export function isChildProfile(profile: Pick<DashboardProfile, 'role'>): boolean {
  return profile.role === 'member'
}

export function familyWorkProfiles(
  currentProfile: DashboardProfile,
  profiles: DashboardProfile[]
): DashboardProfile[] {
  return profiles.filter((profile) => {
    if (!profile.is_active || profile.id === currentProfile.id) return false
    if (isAdultLikeProfile(currentProfile)) return isChildProfile(profile)
    if (isChildProfile(currentProfile)) return isAdultLikeProfile(profile)
    return false
  })
}
