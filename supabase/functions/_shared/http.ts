export function jsonResponse(body: unknown, status: number, headers: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  })
}

export const INVALID_INVITATION_MESSAGE = 'Inbjudan är inte giltig eller kan inte längre användas.'

export function invalidInvitation(headers: HeadersInit): Response {
  return jsonResponse(
    { ok: false, code: 'INVITATION_INVALID', message: INVALID_INVITATION_MESSAGE },
    400,
    headers
  )
}
