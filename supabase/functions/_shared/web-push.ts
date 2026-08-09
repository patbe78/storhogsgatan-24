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

export type PushErrorClass =
  | 'invalid_subscription'
  | 'vapid_error'
  | 'encryption_error'
  | 'push_provider_4xx'
  | 'push_provider_5xx'
  | 'network_error'
  | 'push_transport_error'

export type PushErrorStage = 'vapid_init' | 'encryption' | 'request' | 'provider_response'

export interface PushDiagnostic {
  errorClass: PushErrorClass
  stage: PushErrorStage
  statusCode?: number
  safeCode?: string
}

export type PushResult =
  | { status: 'sent'; errorClass: null; diagnostic: null }
  | {
      status: 'invalid_subscription' | 'failed'
      errorClass: PushErrorClass
      diagnostic: PushDiagnostic
    }

export interface WebPushClient {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: { TTL: number; urgency: string }
  ): Promise<unknown>
}

let webPushClientPromise: Promise<WebPushClient> | null = null

export function initializeWebPush(): Promise<WebPushClient> {
  webPushClientPromise ??= import('npm:web-push@3.6.7').then((module) => {
    const client = (module.default ?? module) as unknown as WebPushClient
    if (
      typeof client.setVapidDetails !== 'function' ||
      typeof client.sendNotification !== 'function'
    ) {
      throw new TypeError('web_push_api_invalid')
    }
    return client
  })
  return webPushClientPromise
}

export function secureEqual(actual: string | null, expected: string): boolean {
  if (!actual || actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1)
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return difference === 0
}

interface PushErrorShape {
  statusCode?: unknown
  code?: unknown
  message?: unknown
  body?: unknown
}

const networkCodes = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED'
])

const providerCodes: ReadonlyArray<[needle: string, safeCode: string]> = [
  ['badjwttoken', 'bad_jwt_token'],
  ['unauthorizedregistration', 'unauthorized_registration'],
  ['invalidregistration', 'invalid_registration'],
  ['mismatchsenderid', 'sender_id_mismatch'],
  ['third_party_auth_error', 'third_party_auth_error'],
  ['quota_exceeded', 'quota_exceeded'],
  ['unavailable', 'provider_unavailable']
]

const vapidMessages: ReadonlyArray<[prefix: string, safeCode: string]> = [
  ['No subject set in vapidDetails.subject.', 'missing_vapid_subject'],
  ['The subject value must be a string', 'invalid_vapid_subject'],
  ['Vapid subject is not a valid URL.', 'invalid_vapid_subject'],
  ['Vapid subject is not an https: or mailto: URL.', 'invalid_vapid_subject'],
  ['No key set vapidDetails.publicKey', 'missing_vapid_public_key'],
  ['Vapid public key', 'invalid_vapid_public_key'],
  ['No key set in vapidDetails.privateKey', 'missing_vapid_private_key'],
  ['Vapid private key', 'invalid_vapid_private_key'],
  ['No audience could be generated for VAPID.', 'invalid_vapid_audience'],
  ['The audience value must be a string', 'invalid_vapid_audience'],
  ['VAPID audience is not a url.', 'invalid_vapid_audience']
]

const encryptionMessages: ReadonlyArray<[prefix: string, safeCode: string]> = [
  ['No user public key provided for encryption.', 'missing_p256dh'],
  ['The subscription p256dh value', 'invalid_p256dh'],
  ['No user auth provided for encryption.', 'missing_auth_secret'],
  ['The subscription auth key', 'invalid_auth_secret'],
  ['Payload must be either a string or a Node Buffer.', 'invalid_payload']
]

function errorShape(error: unknown): PushErrorShape {
  return (typeof error === 'object' && error !== null ? error : {}) as PushErrorShape
}

function safeStatusCode(error: unknown): number | undefined {
  const statusCode = Number(errorShape(error).statusCode)
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
    ? statusCode
    : undefined
}

function safeMessageCode(
  error: unknown,
  messages: ReadonlyArray<[prefix: string, safeCode: string]>
): string | undefined {
  const message = errorShape(error).message
  if (typeof message !== 'string') return undefined
  return messages.find(([prefix]) => message.startsWith(prefix))?.[1]
}

function safeProviderCode(error: unknown): string | undefined {
  const body = errorShape(error).body
  if (typeof body !== 'string') return undefined
  const normalizedBody = body.toLowerCase()
  return providerCodes.find(([needle]) => normalizedBody.includes(needle))?.[1]
}

function failure(
  status: 'invalid_subscription' | 'failed',
  errorClass: PushErrorClass,
  stage: PushErrorStage,
  statusCode?: number,
  safeCode?: string
): PushResult {
  return {
    status,
    errorClass,
    diagnostic: {
      errorClass,
      stage,
      ...(statusCode === undefined ? {} : { statusCode }),
      ...(safeCode === undefined ? {} : { safeCode })
    }
  }
}

function classifyVapidError(error: unknown): PushResult {
  return failure(
    'failed',
    'vapid_error',
    'vapid_init',
    undefined,
    safeMessageCode(error, vapidMessages) ?? 'vapid_init_failed'
  )
}

export function classifyPushError(error: unknown): PushResult {
  const statusCode = safeStatusCode(error)
  if (statusCode === 404 || statusCode === 410)
    return failure(
      'invalid_subscription',
      'invalid_subscription',
      'provider_response',
      statusCode,
      `push_${statusCode}`
    )
  if (statusCode === 401 || statusCode === 403)
    return failure(
      'failed',
      'vapid_error',
      'provider_response',
      statusCode,
      safeProviderCode(error) ?? 'vapid_rejected'
    )
  if (statusCode !== undefined && statusCode >= 400 && statusCode <= 499)
    return failure(
      'failed',
      'push_provider_4xx',
      'provider_response',
      statusCode,
      statusCode === 429 ? 'rate_limited' : safeProviderCode(error)
    )
  if (statusCode !== undefined && statusCode >= 500)
    return failure(
      'failed',
      'push_provider_5xx',
      'provider_response',
      statusCode,
      safeProviderCode(error)
    )

  const vapidCode = safeMessageCode(error, vapidMessages)
  if (vapidCode) return failure('failed', 'vapid_error', 'vapid_init', undefined, vapidCode)

  const encryptionCode = safeMessageCode(error, encryptionMessages)
  const runtimeCode = errorShape(error).code
  if (encryptionCode || runtimeCode === 'ERR_CRYPTO_ECDH_INVALID_PUBLIC_KEY')
    return failure(
      'failed',
      'encryption_error',
      'encryption',
      undefined,
      encryptionCode ?? 'invalid_p256dh'
    )

  if (typeof runtimeCode === 'string' && networkCodes.has(runtimeCode))
    return failure('failed', 'network_error', 'request', undefined, runtimeCode)
  if (errorShape(error).message === 'Socket timeout')
    return failure('failed', 'network_error', 'request', undefined, 'SOCKET_TIMEOUT')

  return failure('failed', 'push_transport_error', 'request')
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
  vapid: { subject: string; publicKey: string; privateKey: string },
  initializedClient?: WebPushClient
): Promise<PushResult> {
  let webpush: WebPushClient
  try {
    webpush = initializedClient ?? (await initializeWebPush())
  } catch {
    return failure('failed', 'push_transport_error', 'request', undefined, 'WEB_PUSH_INIT_FAILED')
  }

  try {
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)
  } catch (error) {
    return classifyVapidError(error)
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: delivery.endpoint,
        keys: { p256dh: delivery.p256dh, auth: delivery.auth_secret }
      },
      buildCalendarPushPayload(delivery),
      { TTL: 600, urgency: 'high' }
    )
    return { status: 'sent', errorClass: null, diagnostic: null }
  } catch (error) {
    return classifyPushError(error)
  }
}
