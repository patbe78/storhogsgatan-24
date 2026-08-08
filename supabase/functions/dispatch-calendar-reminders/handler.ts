import { readSupabaseAdminKey, type EnvironmentReader } from '../_shared/environment.ts'

interface CalendarPushDelivery {
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

interface PushResult {
  status: 'sent' | 'invalid_subscription' | 'failed'
  errorClass: string | null
}

interface RpcResult {
  data: unknown
  error: unknown
}

export interface DispatchClient {
  rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<RpcResult>
}

type SendCalendarPush = (
  delivery: CalendarPushDelivery,
  vapid: { subject: string; publicKey: string; privateKey: string }
) => Promise<PushResult>

interface Diagnostic {
  errorClass: 'missing_env' | 'init_failed'
  runtimeClass?: 'TypeError' | 'SyntaxError' | 'ReferenceError' | 'Error'
}

export interface DispatchDependencies {
  readEnvironment: EnvironmentReader
  createClient: (supabaseUrl: string, adminKey: string) => Promise<DispatchClient>
  loadWebPush: () => Promise<{ sendCalendarPush: SendCalendarPush }>
  logDiagnostic: (diagnostic: Diagnostic) => void
}

interface CoreEnvironment {
  supabaseUrl: string
  adminKey: string
}

interface VapidEnvironment {
  subject: string
  publicKey: string
  privateKey: string
}

function secureEqual(actual: string | null, expected: string): boolean {
  if (!actual || actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < expected.length; index += 1)
    difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index)
  return difference === 0
}

function runtimeClass(error: unknown): Diagnostic['runtimeClass'] {
  if (error instanceof TypeError) return 'TypeError'
  if (error instanceof SyntaxError) return 'SyntaxError'
  if (error instanceof ReferenceError) return 'ReferenceError'
  return 'Error'
}

function coreEnvironment(readEnvironment: EnvironmentReader): CoreEnvironment | null {
  const supabaseUrl = readEnvironment('SUPABASE_URL')
  const adminKey = readSupabaseAdminKey(readEnvironment)
  return supabaseUrl && adminKey ? { supabaseUrl, adminKey } : null
}

function vapidEnvironment(readEnvironment: EnvironmentReader): VapidEnvironment | null {
  const subject = readEnvironment('VAPID_SUBJECT')
  const publicKey = readEnvironment('VAPID_PUBLIC_KEY')
  const privateKey = readEnvironment('VAPID_PRIVATE_KEY')
  return subject && publicKey && privateKey ? { subject, publicKey, privateKey } : null
}

async function processDelivery(
  client: DispatchClient,
  delivery: CalendarPushDelivery,
  vapid: VapidEnvironment,
  sendCalendarPush: SendCalendarPush
) {
  const { data: confirmed, error: confirmError } = await client.rpc(
    'calendar_confirm_push_delivery',
    { p_delivery_id: delivery.delivery_id, p_claim_token: delivery.claim_token }
  )
  if (confirmError || !confirmed) {
    await client.rpc('calendar_complete_push_delivery', {
      p_delivery_id: delivery.delivery_id,
      p_claim_token: delivery.claim_token,
      p_status: 'skipped',
      p_error_class: confirmError ? 'confirmation_failed' : 'recipient_changed'
    })
    return
  }

  const result = await sendCalendarPush(delivery, vapid)
  const { error: completionError } = await client.rpc('calendar_complete_push_delivery', {
    p_delivery_id: delivery.delivery_id,
    p_claim_token: delivery.claim_token,
    p_status: result.status,
    p_error_class: result.errorClass
  })
  if (completionError) {
    console.error('calendar push journal update failed', {
      deliveryId: delivery.delivery_id,
      errorClass: 'journal_update_failed'
    })
  }
}

async function processInBatches(
  client: DispatchClient,
  deliveries: CalendarPushDelivery[],
  vapid: VapidEnvironment,
  sendCalendarPush: SendCalendarPush
) {
  const batchSize = 10
  for (let index = 0; index < deliveries.length; index += batchSize) {
    const results = await Promise.allSettled(
      deliveries
        .slice(index, index + batchSize)
        .map((delivery) => processDelivery(client, delivery, vapid, sendCalendarPush))
    )
    results.forEach((result, resultIndex) => {
      if (result.status === 'rejected') {
        console.error('calendar push delivery failed', {
          deliveryId: deliveries[index + resultIndex]?.delivery_id,
          errorClass: 'unhandled_delivery_error'
        })
      }
    })
  }
}

const defaultDependencies: DispatchDependencies = {
  readEnvironment: (name) => Deno.env.get(name),
  async createClient(supabaseUrl, adminKey) {
    const { serviceClient } = await import('../_shared/database.ts')
    return serviceClient(supabaseUrl, adminKey) as unknown as DispatchClient
  },
  async loadWebPush() {
    const module = await import('../_shared/web-push.ts')
    const initializedClient = await module.initializeWebPush()
    return {
      sendCalendarPush: (delivery, vapid) =>
        module.sendCalendarPush(delivery, vapid, initializedClient)
    }
  },
  logDiagnostic(diagnostic) {
    console.error('calendar push startup diagnostic', diagnostic)
  }
}

export function createDispatchHandler(
  overrides: Partial<DispatchDependencies> = {}
): (request: Request) => Promise<Response> {
  const dependencies = { ...defaultDependencies, ...overrides }
  return async (request) => {
    if (request.method !== 'POST') return new Response(null, { status: 405 })

    const cronSecret = dependencies.readEnvironment('CALENDAR_PUSH_CRON_SECRET')
    if (!cronSecret) {
      dependencies.logDiagnostic({ errorClass: 'missing_env' })
      return Response.json({ ok: false, error: 'missing_env' }, { status: 500 })
    }
    if (!secureEqual(request.headers.get('x-calendar-cron-secret'), cronSecret))
      return new Response(null, { status: 401 })

    const environment = coreEnvironment(dependencies.readEnvironment)
    if (!environment) {
      dependencies.logDiagnostic({ errorClass: 'missing_env' })
      return Response.json({ ok: false, error: 'missing_env' }, { status: 500 })
    }

    let client: DispatchClient
    try {
      client = await dependencies.createClient(environment.supabaseUrl, environment.adminKey)
    } catch (error) {
      dependencies.logDiagnostic({ errorClass: 'init_failed', runtimeClass: runtimeClass(error) })
      return Response.json({ ok: false, error: 'init_failed' }, { status: 500 })
    }

    let claim: RpcResult
    try {
      claim = await client.rpc('calendar_claim_due_push_deliveries', {})
    } catch (error) {
      console.error('calendar push claim failed', {
        errorClass: 'claim_failed',
        runtimeClass: runtimeClass(error)
      })
      return Response.json({ ok: false }, { status: 500 })
    }
    if (claim.error) {
      console.error('calendar push claim failed', { errorClass: 'claim_failed' })
      return Response.json({ ok: false }, { status: 500 })
    }
    const deliveries = (claim.data ?? []) as CalendarPushDelivery[]
    if (deliveries.length === 0) return Response.json({ ok: true, claimed: 0 })

    const vapid = vapidEnvironment(dependencies.readEnvironment)
    if (!vapid) {
      dependencies.logDiagnostic({ errorClass: 'missing_env' })
      return Response.json({ ok: false, error: 'missing_env' }, { status: 500 })
    }

    let webPush: { sendCalendarPush: SendCalendarPush }
    try {
      webPush = await dependencies.loadWebPush()
    } catch (error) {
      dependencies.logDiagnostic({ errorClass: 'init_failed', runtimeClass: runtimeClass(error) })
      return Response.json({ ok: false, error: 'init_failed' }, { status: 500 })
    }

    await processInBatches(client, deliveries, vapid, webPush.sendCalendarPush)
    return Response.json({ ok: true, claimed: deliveries.length })
  }
}
