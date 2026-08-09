import { assertEquals, assertFalse } from 'jsr:@std/assert@1'
import {
  buildCalendarPushPayload,
  classifyPushError,
  occurrenceDate,
  secureEqual,
  sendCalendarPush,
  type CalendarPushDelivery,
  type WebPushClient
} from './web-push.ts'

const delivery: CalendarPushDelivery = {
  delivery_id: 'delivery-1',
  claim_token: 'claim-1',
  endpoint: 'https://push.invalid/secret-endpoint',
  p256dh: 'secret-p256dh',
  auth_secret: 'secret-auth',
  binding_id: '11111111-1111-4111-8111-111111111111',
  event_id: '22222222-2222-4222-8222-222222222222',
  occurrence_starts_at: '2026-03-29T07:00:00.000Z',
  scheduled_at: '2026-03-29T06:45:00.000Z',
  title: 'Fotbollsträning',
  all_day: false,
  offset_minutes: 15
}

Deno.test('cron-hemligheten jämförs utan tidig exit', () => {
  assertEquals(secureEqual('samma', 'samma'), true)
  assertFalse(secureEqual('annan', 'samma'))
  assertFalse(secureEqual(null, 'samma'))
})

Deno.test('404 och 410 klassas som ogiltig subscription', () => {
  assertEquals(classifyPushError({ statusCode: 404 }), {
    status: 'invalid_subscription',
    errorClass: 'invalid_subscription',
    diagnostic: {
      errorClass: 'invalid_subscription',
      stage: 'provider_response',
      statusCode: 404,
      safeCode: 'push_404'
    }
  })
  assertEquals(classifyPushError({ statusCode: 410 }).status, 'invalid_subscription')
})

Deno.test('provider-, nätverks- och krypteringsfel får säkra klasser', () => {
  assertEquals(classifyPushError({ statusCode: 400 }).diagnostic, {
    errorClass: 'push_provider_4xx',
    stage: 'provider_response',
    statusCode: 400
  })
  assertEquals(classifyPushError({ statusCode: 503 }).diagnostic, {
    errorClass: 'push_provider_5xx',
    stage: 'provider_response',
    statusCode: 503
  })
  assertEquals(classifyPushError({ code: 'ECONNRESET' }).diagnostic, {
    errorClass: 'network_error',
    stage: 'request',
    safeCode: 'ECONNRESET'
  })
  assertEquals(
    classifyPushError({
      message: 'The subscription p256dh value should be 65 bytes long.'
    }).diagnostic,
    {
      errorClass: 'encryption_error',
      stage: 'encryption',
      safeCode: 'invalid_p256dh'
    }
  )
})

Deno.test('providerkod vitlistas utan att råsvaret eller credentials exponeras', () => {
  const result = classifyPushError({
    statusCode: 403,
    body: `BadJwtToken ${delivery.endpoint} ${delivery.auth_secret}`,
    endpoint: delivery.endpoint
  })
  assertEquals(result.diagnostic, {
    errorClass: 'vapid_error',
    stage: 'provider_response',
    statusCode: 403,
    safeCode: 'bad_jwt_token'
  })
  const serialized = JSON.stringify(result)
  assertFalse(serialized.includes(delivery.endpoint))
  assertFalse(serialized.includes(delivery.auth_secret))
})

Deno.test('okänt transportfel är sanerad sista fallback', () => {
  const result = classifyPushError({
    message: `transport ${delivery.endpoint}`,
    stack: `${delivery.p256dh} ${delivery.auth_secret}`
  })
  assertEquals(result.diagnostic, {
    errorClass: 'push_transport_error',
    stage: 'request'
  })
  const serialized = JSON.stringify(result)
  assertFalse(serialized.includes(delivery.endpoint))
  assertFalse(serialized.includes(delivery.p256dh))
  assertFalse(serialized.includes(delivery.auth_secret))
})

Deno.test('VAPID-fel avbryter före request och loggar aldrig nyckelvärden', async () => {
  let requestStarted = false
  const client: WebPushClient = {
    setVapidDetails: () => {
      throw new Error(`Vapid private key must be valid ${delivery.auth_secret}`)
    },
    sendNotification: () => {
      requestStarted = true
      return Promise.resolve()
    }
  }
  const result = await sendCalendarPush(
    delivery,
    {
      subject: 'mailto:test@example.invalid',
      publicKey: 'public-vapid',
      privateKey: 'private-vapid'
    },
    client
  )
  assertEquals(result.diagnostic, {
    errorClass: 'vapid_error',
    stage: 'vapid_init',
    safeCode: 'invalid_vapid_private_key'
  })
  assertFalse(requestStarted)
  const serialized = JSON.stringify(result)
  assertFalse(serialized.includes('private-vapid'))
  assertFalse(serialized.includes(delivery.auth_secret))
})

Deno.test('payloaden är minimal och saknar subscription-credentials och beskrivning', () => {
  const payload = buildCalendarPushPayload(delivery)
  const parsed = JSON.parse(payload)
  assertEquals(parsed.title, 'Fotbollsträning')
  assertEquals(parsed.calendarDate, '2026-03-29')
  assertEquals(parsed.eventKey, `${delivery.event_id}:2026-03-29T07:00:00.000Z`)
  assertFalse(payload.includes(delivery.endpoint))
  assertFalse(payload.includes(delivery.p256dh))
  assertFalse(payload.includes(delivery.auth_secret))
  assertFalse(payload.includes('description'))
  assertEquals(occurrenceDate('2026-10-25T08:00:00Z'), '2026-10-25')
})
