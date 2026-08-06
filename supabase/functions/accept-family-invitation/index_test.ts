import { assertEquals } from 'jsr:@std/assert@1'

const functionsUrl = Deno.env.get('FAMILY_TEST_FUNCTIONS_URL')
const anonKey = Deno.env.get('FAMILY_TEST_SUPABASE_ANON_KEY')
const appOrigin = Deno.env.get('FAMILY_TEST_APP_ORIGIN')

Deno.test({
  name: 'accept function returns the neutral response for an unknown token',
  ignore: !functionsUrl || !anonKey || !appOrigin,
  async fn() {
    const response = await fetch(`${functionsUrl}/accept-family-invitation`, {
      method: 'POST',
      headers: { apikey: anonKey!, 'Content-Type': 'application/json', Origin: appOrigin! },
      body: JSON.stringify({
        action: 'preview',
        token: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      })
    })
    const body = await response.json()
    assertEquals(body, {
      ok: false,
      code: 'INVITATION_INVALID',
      message: 'Inbjudan är inte giltig eller kan inte längre användas.'
    })
  }
})
