import { assertEquals } from 'jsr:@std/assert@1'
import { sendInvitationEmail } from './resend.ts'

Deno.test('Resend failure returns false without exposing provider response', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = () =>
    Promise.resolve(new Response('sensitive provider response', { status: 500 }))
  try {
    assertEquals(
      await sendInvitationEmail({
        apiKey: 'test-key',
        from: 'Familjen <test@example.com>',
        to: 'asa@example.com',
        invitedName: 'Åsa',
        invitedBy: 'Patrik',
        householdName: 'Storhogsgatan 24',
        roleLabel: 'familjemedlem',
        expiresAt: '2026-08-13T12:00:00Z',
        invitationUrl: 'https://app.test/acceptera-inbjudan?token=not-logged'
      }),
      false
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
