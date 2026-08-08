import { assertEquals } from 'jsr:@std/assert@1'

const functionsUrl = Deno.env.get('PUSH_TEST_FUNCTIONS_URL')
const cronSecret = Deno.env.get('PUSH_TEST_CRON_SECRET')

Deno.test({
  name: 'dispatch kräver serverns cron-secret',
  ignore: !functionsUrl || !cronSecret,
  async fn() {
    const endpoint = `${functionsUrl}/dispatch-calendar-reminders`
    const missing = await fetch(endpoint, { method: 'POST' })
    assertEquals(missing.status, 401)
    const wrong = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'fel' }
    })
    assertEquals(wrong.status, 401)
  }
})
