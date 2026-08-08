import webpush from 'npm:web-push@3.6.7'

export interface CalendarPushDelivery {
  delivery_id: string
  claim_token: string
  endpoint: string
  p256dh: string
  auth_secret: string
  binding_id: string
  event_id: string
  occurrence_starts_at: string
  scheduled_at: string
  title: string
  all_day: boolean
  offset_minutes: number
}

export type PushResult =
  | { status: 'sent'; errorClass: null }
  | { status: 'invalid_subscription' | 'failed'; errorClass: string }

export function secureEqual(actual: string | null, expected: string): boolean {
  if (!actual || actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1)
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return difference === 0
}

export function classifyPushError(error: unknown): PushResult {
  const statusCode = Number((error as { statusCode?: unknown } | null)?.statusCode ?? 0)
  if (statusCode === 404 || statusCode === 410)
    return { status: 'invalid_subscription', errorClass: `push_${statusCode}` }
  if (statusCode === 401 || statusCode === 403)
    return { status: 'failed', errorClass: 'vapid_rejected' }
  if (statusCode === 429) return { status: 'failed', errorClass: 'push_rate_limited' }
  if (statusCode >= 500) return { status: 'failed', errorClass: 'push_provider_error' }
  return { status: 'failed', errorClass: 'push_transport_error' }
}

export function occurrenceDate(value: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value))
  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`
}

function reminderLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'nu'
  if (offsetMinutes < 60) return `${offsetMinutes} minuter före`
  if (offsetMinutes % 1440 === 0)
    return `${offsetMinutes / 1440} ${offsetMinutes === 1440 ? 'dag' : 'dagar'} före`
  if (offsetMinutes % 60 === 0)
    return `${offsetMinutes / 60} ${offsetMinutes === 60 ? 'timme' : 'timmar'} före`
  return `${offsetMinutes} minuter före`
}

export function buildCalendarPushPayload(delivery: CalendarPushDelivery): string {
  const starts = new Date(delivery.occurrence_starts_at)
  const dateTime = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(delivery.all_day ? {} : { hour: '2-digit', minute: '2-digit' })
  }).format(starts)
  return JSON.stringify({
    title: delivery.title,
    body: `${delivery.all_day ? `Heldag ${dateTime}` : dateTime} · ${reminderLabel(delivery.offset_minutes)}`,
    bindingId: delivery.binding_id,
    calendarDate: occurrenceDate(delivery.occurrence_starts_at),
    eventKey: `${delivery.event_id}:${starts.toISOString()}`,
    deliveryId: delivery.delivery_id
  })
}

export async function sendCalendarPush(
  delivery: CalendarPushDelivery,
  vapid: { subject: string; publicKey: string; privateKey: string }
): Promise<PushResult> {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  try {
    await webpush.sendNotification(
      {
        endpoint: delivery.endpoint,
        keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret }
      },
      buildCalendarPushPayload(delivery),
      { TTL: 600, urgency: 'high' }
    )
    return { status: 'sent', errorClass: null }
  } catch (error) {
    return classifyPushError(error)
  }
}
