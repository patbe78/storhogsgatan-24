export type EnvironmentReader = (name: string) => string | undefined

export function readSupabaseAdminKey(readEnvironment: EnvironmentReader): string | null {
  const secretKeys = readEnvironment('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>
      if (typeof parsed.default === 'string' && parsed.default.length > 0) return parsed.default
    } catch {
      // Fall through to the hosted legacy variable without logging secret material.
    }
  }
  return readEnvironment('SUPABASE_SERVICE_ROLE_KEY') || null
}
