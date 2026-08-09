import { assertEquals, assertFalse } from 'jsr:@std/assert@1'
import { createDispatchHandler, type DispatchClient, type DispatchDependencies } from './handler.ts'

const functionsUrl = Deno.env.get('PUSH_TEST_FUNCTIONS_URL')
const cronSecret = Deno.env.get('PUSH_TEST_CRON_SECRET')

function environment(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    CALENDAR_PUSH_CRON_SECRET: 'cron-test-secret',
    SUPABASE_URL: 'https://project.test',
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'current-admin-key' }),
    VAPID_SUBJECT: 'https://app.test',
    VAPID_PUBLIC_KEY: 'public-vapid',
    VAPID_PRIVATE_KEY: 'private-vapid',
    ...overrides
  }
  return (name: string) => values[name]
}

function emptyClient(): DispatchClient {
  return {
    rpc: () => Promise.resolve({ data: [], error: null })
  }
}

function dependencies(overrides: Partial<DispatchDependencies> = {}): DispatchDependencies & {
  databaseLoads: { value: number }
  webPushLoads: { value: number }
} {
  const databaseLoads = { value: 0 }
  const webPushLoads = { value: 0 }
  return {
    readEnvironment: environment(),
    createClient: () => {
      databaseLoads.value += 1
      return Promise.resolve(emptyClient())
    },
    loadWebPush: () => {
      webPushLoads.value += 1
      return Promise.resolve({
        sendCalendarPush: () => Promise.resolve({ status: 'sent', errorClass: null })
      })
    },
    logDiagnostic: () => undefined,
    logTransportDiagnostic: () => undefined,
    databaseLoads,
    webPushLoads,
    ...overrides
  }
}

Deno.test('handlern startar och avvisar fel metod utan runtime-initialisering', async () => {
  const input = dependencies()
  const response = await createDispatchHandler(input)(new Request('https://function.test'))
  assertEquals(response.status, 405)
  assertEquals(input.databaseLoads.value, 0)
  assertEquals(input.webPushLoads.value, 0)
})

Deno.test('POST utan eller med fel cron-secret ger 401 före Web Push', async () => {
  const input = dependencies()
  const handler = createDispatchHandler(input)
  assertEquals(
    (await handler(new Request('https://function.test', { method: 'POST' }))).status,
    401
  )
  assertEquals(
    (
      await handler(
        new Request('https://function.test', {
          method: 'POST',
          headers: { 'x-calendar-cron-secret': 'fel' }
        })
      )
    ).status,
    401
  )
  assertEquals(input.databaseLoads.value, 0)
  assertEquals(input.webPushLoads.value, 0)
})

Deno.test('tom authorized claim använder aktuell secret-key-variabel utan Web Push', async () => {
  let receivedAdminKey = ''
  const input = dependencies({
    createClient: (_url, adminKey) => {
      receivedAdminKey = adminKey
      return Promise.resolve(emptyClient())
    }
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'cron-test-secret' }
    })
  )
  assertEquals(response.status, 200)
  assertEquals(await response.json(), { ok: true, claimed: 0 })
  assertEquals(receivedAdminKey, 'current-admin-key')
  assertEquals(input.webPushLoads.value, 0)
})

Deno.test('legacy service-role key fungerar som säker fallback', async () => {
  let receivedAdminKey = ''
  const input = dependencies({
    readEnvironment: environment({
      SUPABASE_SECRET_KEYS: '',
      SUPABASE_SERVICE_ROLE_KEY: 'legacy-admin-key'
    }),
    createClient: (_url, adminKey) => {
      receivedAdminKey = adminKey
      return Promise.resolve(emptyClient())
    }
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'cron-test-secret' }
    })
  )
  assertEquals(response.status, 200)
  assertEquals(receivedAdminKey, 'legacy-admin-key')
})

Deno.test('saknad miljö ger kontrollerad 500 och endast sanerad diagnostik', async () => {
  const diagnostics: unknown[] = []
  const input = dependencies({
    readEnvironment: () => undefined,
    logDiagnostic: (diagnostic) => diagnostics.push(diagnostic)
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', { method: 'POST' })
  )
  assertEquals(response.status, 500)
  assertEquals(await response.json(), { ok: false, error: 'missing_env' })
  assertEquals(diagnostics, [{ errorClass: 'missing_env' }])
})

Deno.test('saknad servermiljö efter godkänd auth ger kontrollerad 500', async () => {
  const diagnostics: unknown[] = []
  const input = dependencies({
    readEnvironment: environment({
      SUPABASE_URL: '',
      SUPABASE_SECRET_KEYS: '',
      SUPABASE_SERVICE_ROLE_KEY: ''
    }),
    logDiagnostic: (diagnostic) => diagnostics.push(diagnostic)
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'cron-test-secret' }
    })
  )
  assertEquals(response.status, 500)
  assertEquals(await response.json(), { ok: false, error: 'missing_env' })
  assertEquals(diagnostics, [{ errorClass: 'missing_env' }])
  assertEquals(input.webPushLoads.value, 0)
})

Deno.test('importfel ger sanerad init_failed utan credentials', async () => {
  const diagnostics: unknown[] = []
  const delivery = {
    delivery_id: 'delivery-1',
    claim_token: 'claim-1',
    endpoint: 'https://secret-endpoint.invalid',
    p256dh: 'secret-p256dh',
    auth_secret: 'secret-auth',
    binding_id: 'binding-1',
    event_id: 'event-1',
    occurrence_starts_at: '2026-08-08T10:00:00Z',
    scheduled_at: '2026-08-08T09:45:00Z',
    title: 'Test',
    all_day: false,
    offset_minutes: 15
  }
  const input = dependencies({
    createClient: () =>
      Promise.resolve({
        rpc: () => Promise.resolve({ data: [delivery], error: null })
      }),
    loadWebPush: () =>
      Promise.reject(new TypeError('VAPID_PRIVATE_KEY=private-vapid secret-endpoint')),
    logDiagnostic: (diagnostic) => diagnostics.push(diagnostic)
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'cron-test-secret' }
    })
  )
  assertEquals(response.status, 500)
  assertEquals(diagnostics, [{ errorClass: 'init_failed', runtimeClass: 'TypeError' }])
  const logged = JSON.stringify(diagnostics)
  assertFalse(logged.includes('private-vapid'))
  assertFalse(logged.includes('secret-endpoint'))
  assertFalse(logged.includes('secret-p256dh'))
  assertFalse(logged.includes('secret-auth'))
})

Deno.test('transportdiagnostik loggas och journalförs utan credentials', async () => {
  const transportDiagnostics: unknown[] = []
  let completionParameters: Record<string, unknown> | undefined
  const delivery = {
    delivery_id: 'delivery-transport',
    claim_token: 'claim-transport',
    endpoint: 'https://secret-endpoint.invalid',
    p256dh: 'secret-p256dh',
    auth_secret: 'secret-auth',
    binding_id: 'binding-transport',
    event_id: 'event-transport',
    occurrence_starts_at: '2026-08-09T10:00:00Z',
    scheduled_at: '2026-08-09T09:45:00Z',
    title: 'Test',
    all_day: false,
    offset_minutes: 15
  }
  const input = dependencies({
    createClient: () =>
      Promise.resolve({
        rpc: (name, parameters) => {
          if (name === 'calendar_claim_due_push_deliveries')
            return Promise.resolve({ data: [delivery], error: null })
          if (name === 'calendar_confirm_push_delivery')
            return Promise.resolve({ data: true, error: null })
          completionParameters = parameters
          return Promise.resolve({ data: null, error: null })
        }
      }),
    loadWebPush: () =>
      Promise.resolve({
        sendCalendarPush: () =>
          Promise.resolve({
            status: 'failed',
            errorClass: 'network_error',
            diagnostic: {
              errorClass: 'network_error',
              stage: 'request',
              safeCode: 'ECONNRESET'
            }
          })
      }),
    logTransportDiagnostic: (diagnostic) => transportDiagnostics.push(diagnostic)
  })
  const response = await createDispatchHandler(input)(
    new Request('https://function.test', {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'cron-test-secret' }
    })
  )
  assertEquals(response.status, 200)
  assertEquals(transportDiagnostics, [
    { errorClass: 'network_error', stage: 'request', safeCode: 'ECONNRESET' }
  ])
  assertEquals(completionParameters?.p_error_class, 'network_error')
  const logged = JSON.stringify(transportDiagnostics)
  assertFalse(logged.includes(delivery.endpoint))
  assertFalse(logged.includes(delivery.p256dh))
  assertFalse(logged.includes(delivery.auth_secret))
})

Deno.test({
  name: 'deployad dispatch kräver serverns cron-secret',
  ignore: !functionsUrl || !cronSecret,
  async fn() {
    const endpoint = `${functionsUrl}/dispatch-calendar-reminders`
    const method = await fetch(endpoint)
    assertEquals(method.status, 405)
    const missing = await fetch(endpoint, { method: 'POST' })
    assertEquals(missing.status, 401)
    const wrong = await fetch(endpoint, {
      method: 'POST',
      headers: { 'x-calendar-cron-secret': 'fel' }
    })
    assertEquals(wrong.status, 401)
  }
})
