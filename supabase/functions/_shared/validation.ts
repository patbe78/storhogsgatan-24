export type InvitationRole = 'adult' | 'member'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const COLOR_PATTERN = /^#[0-9A-F]{6}$/
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeColor(value: string): string {
  return value.trim().toUpperCase()
}

export function isValidEmail(value: string): boolean {
  return value.length <= 320 && EMAIL_PATTERN.test(value)
}

export function isValidColor(value: string): boolean {
  return COLOR_PATTERN.test(value)
}

export function isInvitationRole(value: string): value is InvitationRole {
  return value === 'adult' || value === 'member'
}

export function isInvitationToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export function validateInvitationInput(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : ''
  const role = typeof input.role === 'string' ? input.role : ''
  const profileColor =
    typeof input.profileColor === 'string' ? normalizeColor(input.profileColor) : ''
  if (
    name.length < 1 ||
    name.length > 100 ||
    !isValidEmail(email) ||
    !isInvitationRole(role) ||
    !isValidColor(profileColor)
  ) {
    return null
  }
  return { name, email, role, profileColor }
}
