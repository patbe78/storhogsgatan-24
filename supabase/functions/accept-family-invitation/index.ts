import { corsHeaders } from '../_shared/cors.ts'
import { hashInvitationToken } from '../_shared/crypto.ts'
import { bearerToken, requiredEnvironment, serviceClient } from '../_shared/database.ts'
import { invalidInvitation, jsonResponse } from '../_shared/http.ts'
import { isInvitationToken } from '../_shared/validation.ts'

Deno.serve(async (request) => {
  const environment = requiredEnvironment()
  if (!environment) return new Response(null, { status: 500 })
  const headers = corsHeaders(request, environment.appBaseUrl)
  if (!headers) return new Response(null, { status: 403 })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return jsonResponse({ ok: false }, 405, headers)

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return invalidInvitation(headers)
  }
  const token = typeof body.token === 'string' ? body.token : ''
  if (!isInvitationToken(token)) return invalidInvitation(headers)
  const tokenHash = await hashInvitationToken(token)
  const client = serviceClient(environment.supabaseUrl, environment.serviceRoleKey)
  const { data: previewRows, error: previewError } = await client.rpc(
    'family_get_invitation_preview_internal',
    { p_token_hash: tokenHash }
  )
  const preview = Array.isArray(previewRows) ? previewRows[0] : null
  if (previewError || !preview) return invalidInvitation(headers)
  if (body.action === 'preview') {
    return jsonResponse(
      {
        ok: true,
        invitation: {
          name: preview.invited_name,
          email: preview.email,
          role: preview.role,
          profileColor: preview.profile_color,
          householdName: preview.household_name,
          expiresAt: preview.expires_at,
          accountExists: preview.account_exists
        }
      },
      200,
      headers
    )
  }
  if (body.action !== 'accept') return invalidInvitation(headers)

  let userId: string | null = null
  let createdUser = false
  const jwt = bearerToken(request)
  if (jwt) {
    const { data, error } = await client.auth.getUser(jwt)
    if (!error && data.user) userId = data.user.id
  }
  if (
    !userId &&
    !preview.account_exists &&
    typeof body.password === 'string' &&
    body.password.length >= 8
  ) {
    const { data, error } = await client.auth.admin.createUser({
      email: preview.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: preview.invited_name }
    })
    if (error || !data.user) {
      return jsonResponse(
        { ok: false, code: 'ACCOUNT_CREATE_FAILED', message: 'Kontot kunde inte skapas.' },
        400,
        headers
      )
    }
    userId = data.user.id
    createdUser = true
  } else if (!userId) {
    return jsonResponse(
      { ok: false, code: 'AUTH_REQUIRED', message: 'Logga in med den inbjudna e-postadressen.' },
      401,
      headers
    )
  }

  const { error: acceptError } = await client.rpc('family_accept_invitation_internal', {
    p_token_hash: tokenHash,
    p_auth_user_id: userId
  })
  if (acceptError) {
    await client.rpc('family_register_accept_failure_internal', { p_token_hash: tokenHash })
    if (createdUser) {
      return jsonResponse(
        {
          ok: false,
          code: 'RESUME_REQUIRED',
          message:
            'Kontot skapades, men anslutningen kunde inte slutföras. Logga in och försök igen.'
        },
        409,
        headers
      )
    }
    return invalidInvitation(headers)
  }
  return jsonResponse({ ok: true, loginRequired: createdUser }, 200, headers)
})
