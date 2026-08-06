import { assertEquals, assertMatch } from 'jsr:@std/assert@1'
import { generateInvitationToken, hashInvitationToken } from './crypto.ts'

Deno.test('invitation token uses 32 random bytes and hashes to SHA-256 hex', async () => {
  const token = generateInvitationToken()
  assertMatch(token, /^[A-Za-z0-9_-]{43}$/)
  assertMatch(await hashInvitationToken(token), /^[0-9a-f]{64}$/)
  assertEquals(
    await hashInvitationToken('abc'),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
  )
})
