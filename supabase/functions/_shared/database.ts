import { createClient } from 'npm:@supabase/supabase-js@2'

export function requiredEnvironment() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appBaseUrl = Deno.env.get('APP_BASE_URL')
  if (!supabaseUrl || !serviceRoleKey || !appBaseUrl) return null
  return { supabaseUrl, serviceRoleKey, appBaseUrl }
}

export function serviceClient(supabaseUrl: string, serviceRoleKey: string) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}
