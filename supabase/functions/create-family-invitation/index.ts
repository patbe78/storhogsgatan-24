import { corsHeaders } from '../_shared/cors.ts'
import { generateInvitationToken, hashInvitationToken } from '../_shared/crypto.ts'
import { bearerToken, requiredEnvironment, serviceClient } from '../_shared/database.ts'
import { jsonResponse } from '../_shared/http.ts'
import { sendInvitationEmail } from '../_shared/resend.ts'
import { validateInvitationInput } from '../_shared/validation.ts'

function databaseError(error: { message?: string } | null, headers: HeadersInit): Response {
  const message = error?.message ?? ''
  if (message.includes('FAMILY_MEMBER_EXISTS')) {
    return jsonResponse(
      {
        ok: false,
        code: 'MEMBER_EXISTS',
        message: 'Den här e-postadressen är redan medlem i hushållet.'
      },
      409,
      headers
    )
  }
  if (message.includes('FAMILY_INVITATION_EXISTS')) {
    return jsonResponse(
      {
        ok: false,
        code: 'INVITATION_EXISTS',
        message: 'Det finns redan en aktiv inbjudan till denna e-postadress.'
      },
      409,
      headers
    )
  }
  if (message.includes('FAMILY_FORBIDDEN')) {
    return jsonResponse(
      { ok: false, code: 'FORBIDDEN', message: 'Du har inte behörighet att utföra denna åtgärd.' },
      403,
      headers
    )
  }
  return jsonResponse(
    { ok: false, code: 'INVITATION_FAILED', message: 'Inbjudan kunde inte skickas.' },
    400,
    headers
  )
}

Deno.serve(async (request) => {
  const environment = requiredEnvironment()
  if (!environment) return new Response(null, { status: 500 })
  const headers = corsHeaders(request, environment.appBaseUrl)
  if (!headers) return new Response(null, { status: 403 })
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return jsonResponse({ ok: false }, 405, headers)

  const jwt = bearerToken(request)
  if (!jwt)
    return jsonResponse(
      { ok: false, code: 'FORBIDDEN', message: 'Du har inte behörighet att utföra denna åtgärd.' },
      401,
      headers
    )
  const client = serviceClient(environment.supabaseUrl, environment.serviceRoleKey)
  const { data: userData, error: userError } = await client.auth.getUser(jwt)
  if (userError || !userData.user) {
    return jsonResponse(
      { ok: false, code: 'FORBIDDEN', message: 'Du har inte behörighet att utföra denna åtgärd.' },
      401,
      headers
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse(
      { ok: false, code: 'VALIDATION', message: 'Kontrollera formuläret och försök igen.' },
      400,
      headers
    )
  }
  const input = validateInvitationInput(body)
  if (!input)
    return jsonResponse(
      { ok: false, code: 'VALIDATION', message: 'Kontrollera formuläret och försök igen.' },
      400,
      headers
    )

  const token = generateInvitationToken()
  const tokenHash = await hashInvitationToken(token)
  const { data: invitationId, error: createError } = await client.rpc(
    'family_create_invitation_internal',
    {
      p_actor_user_id: userData.user.id,
      p_email: input.email,
      p_invited_name: input.name,
      p_role: input.role,
      p_profile_color: input.profileColor,
      p_token_hash: tokenHash
    }
  )
  if (createError || !invitationId) return databaseError(createError, headers)

  const [{ data: invitation }, { data: actor }] = await Promise.all([
    client
      .from('family_invitations')
      .select('expires_at,household_id')
      .eq('id', invitationId)
      .single(),
    client.from('profiles').select('name,household_id').eq('id', userData.user.id).single()
  ])
  const { data: household } = actor?.household_id
    ? await client.from('households').select('name').eq('id', actor.household_id).single()
    : { data: null }
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('FAMILY_INVITE_FROM')
  let delivered = false
  if (invitation?.expires_at && actor?.name && household?.name && resendApiKey && from) {
    const url = new URL(
      'acceptera-inbjudan',
      environment.appBaseUrl.endsWith('/') ? environment.appBaseUrl : `${environment.appBaseUrl}/`
    )
    url.searchParams.set('token', token)
    delivered = await sendInvitationEmail({
      apiKey: resendApiKey,
      from,
      to: input.email,
      invitedName: input.name,
      invitedBy: actor.name,
      householdName: household.name,
      roleLabel: input.role === 'adult' ? 'vuxen' : 'familjemedlem',
      expiresAt: invitation.expires_at,
      invitationUrl: url.toString()
    })
  }

  const { error: deliveryError } = await client.rpc('family_mark_invitation_delivery_internal', {
    p_invitation_id: invitationId,
    p_succeeded: delivered
  })
  if (!delivered || deliveryError) {
    return jsonResponse(
      { ok: false, code: 'DELIVERY_FAILED', message: 'Inbjudan kunde inte skickas.' },
      502,
      headers
    )
  }
  return jsonResponse({ ok: true }, 201, headers)
})
