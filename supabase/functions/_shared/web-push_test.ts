import { assertEquals, assertFalse } from 'jsr:@std/assert@1'
import {
  buildCalendarPushPayload,
  classifyPushError,
  occurrenceDate,
  secureEqual,
  type CalendarPushDelivery
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
  assertEquals(classifyPushError({ statusCode: 404 }).status, 'invalid_subscription')
  assertEquals(classifyPushError({ statusCode: 410 }).status, 'invalid_subscription')
  assertEquals(classifyPushError({ statusCode: 503 }).status, 'failed')
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
