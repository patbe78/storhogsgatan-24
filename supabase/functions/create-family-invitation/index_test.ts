import { assertEquals } from 'jsr:@std/assert@1'

const functionsUrl = Deno.env.get('FAMILY_TEST_FUNCTIONS_URL')
const anonKey = Deno.env.get('FAMILY_TEST_SUPABASE_ANON_KEY')
const appOrigin = Deno.env.get('FAMILY_TEST_APP_ORIGIN')

Deno.test({
  name: 'create function rejects missing user JWT and foreign CORS origin',
  ignore: !functionsUrl || !anonKey || !appOrigin,
  async fn() {
    const endpoint = `${functionsUrl}/create-family-invitation`
    const missingJwt = await fetch(endpoint, {
      method: 'POST',
      headers: { apikey: anonKey!, 'Content-Type': 'application/json', Origin: appOrigin! },
      body: JSON.stringify({
        name: 'Åsa',
        email: 'asa@example.com',
        role: 'member',
        profileColor: '#112233'
      })
    })
    assertEquals(missingJwt.status, 401)

    const foreignOrigin = await fetch(endpoint, {
      method: 'OPTIONS',
      headers: { apikey: anonKey!, Origin: 'https://attacker.test' }
    })
    assertEquals(foreignOrigin.status, 403)
  }
})
