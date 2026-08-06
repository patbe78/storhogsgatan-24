import { assertEquals } from 'jsr:@std/assert@1'
import { corsHeaders } from './cors.ts'

Deno.test('CORS allows only the configured application origin', () => {
  const allowed = corsHeaders(
    new Request('https://functions.test', { headers: { Origin: 'https://app.test' } }),
    'https://app.test/storhogsgatan-24/'
  )
  assertEquals(new Headers(allowed!).get('Access-Control-Allow-Origin'), 'https://app.test')
  assertEquals(
    corsHeaders(
      new Request('https://functions.test', { headers: { Origin: 'https://attacker.test' } }),
      'https://app.test/storhogsgatan-24/'
    ),
    null
  )
})
