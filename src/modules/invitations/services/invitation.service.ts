import { supabase } from '@/shared/services/supabase'
import type { InvitationInput, InvitationPreview, InvitationResponse } from '../types/invitation'
import { INVALID_INVITATION_MESSAGE } from '../utils/invitation-errors'

function client() {
  if (!supabase) throw new Error('Supabase-klienten är inte konfigurerad.')
  return supabase
}

const safeMessages: Record<string, string> = {
  MEMBER_EXISTS: 'Den här e-postadressen är redan medlem i hushållet.',
  INVITATION_EXISTS: 'Det finns redan en aktiv inbjudan till denna e-postadress.',
  FORBIDDEN: 'Du har inte behörighet att utföra denna åtgärd.',
  VALIDATION: 'Kontrollera formuläret och försök igen.',
  INVITATION_FAILED: 'Inbjudan kunde inte skickas.',
  DELIVERY_FAILED: 'Inbjudan kunde inte skickas.',
  INVITATION_INVALID: INVALID_INVITATION_MESSAGE,
  AUTH_REQUIRED: 'Logga in med den inbjudna e-postadressen.',
  ACCOUNT_CREATE_FAILED: 'Kontot kunde inte skapas.',
  RESUME_REQUIRED:
    'Kontot skapades, men anslutningen kunde inte slutföras. Logga in och försök igen.'
}

async function responseFromError(error: unknown): Promise<InvitationResponse | null> {
  if (!error || typeof error !== 'object' || !('context' in error)) return null
  const context = error.context
  if (!(context instanceof Response)) return null
  try {
    const payload = (await context.clone().json()) as { code?: unknown }
    const code = typeof payload.code === 'string' ? payload.code : ''
    const message = safeMessages[code]
    return message ? { ok: false, code, message } : null
  } catch {
    return null
  }
}

async function invoke(body: Record<string, unknown>): Promise<InvitationResponse> {
  const { data, error } = await client().functions.invoke<InvitationResponse>(
    'accept-family-invitation',
    { body }
  )
  if (error && !data) {
    const safe = await responseFromError(error)
    return safe ?? { ok: false, message: INVALID_INVITATION_MESSAGE }
  }
  return data ?? { ok: false, message: INVALID_INVITATION_MESSAGE }
}

export async function createInvitation(input: InvitationInput): Promise<void> {
  const { data, error } = await client().functions.invoke<InvitationResponse>(
    'create-family-invitation',
    { body: input }
  )
  if (error) {
    const safe = await responseFromError(error)
    throw new Error(safe?.message ?? 'Inbjudan kunde inte skickas.')
  }
  if (!data?.ok) throw new Error(data?.message ?? 'Inbjudan kunde inte skickas.')
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const response = await invoke({ action: 'preview', token })
  if (!response.ok || !response.invitation) {
    throw new Error(INVALID_INVITATION_MESSAGE)
  }
  return response.invitation
}

export async function acceptInvitation(
  token: string,
  password?: string
): Promise<InvitationResponse> {
  return invoke({ action: 'accept', token, ...(password ? { password } : {}) })
}

export async function signInInvitedUser(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email, password })
  if (error) throw new Error('Inloggningen misslyckades. Kontrollera uppgifterna.')
}
