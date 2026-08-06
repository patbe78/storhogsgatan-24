import { assertEquals } from 'jsr:@std/assert@1'
import { normalizeEmail, validateInvitationInput } from './validation.ts'

Deno.test('normalizes and validates invitation input', () => {
  assertEquals(normalizeEmail(' ASA@EXAMPLE.COM '), 'asa@example.com')
  assertEquals(
    validateInvitationInput({
      name: 'Åsa',
      email: 'asa@example.com',
      role: 'member',
      profileColor: '#aabbcc'
    }),
    { name: 'Åsa', email: 'asa@example.com', role: 'member', profileColor: '#AABBCC' }
  )
  assertEquals(
    validateInvitationInput({ name: '', email: 'fel', role: 'admin', profileColor: 'red' }),
    null
  )
})
