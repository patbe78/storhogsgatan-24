import { serviceClient } from '../_shared/database.ts'
import { secureEqual, sendCalendarPush, type CalendarPushDelivery } from '../_shared/web-push.ts'

interface Environment {
  supabaseUrl: string
  serviceRoleKey: string
  cronSecret: string
  vapidSubject: string
  vapidPublicKey: string
  vapidPrivateKey: string
}

function environment(): Environment | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const cronSecret = Deno.env.get('CALENDAR_PUSH_CRON_SECRET')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !cronSecret ||
    !vapidSubject ||
    !vapidPublicKey ||
    !vapidPrivateKey
  )
    return null
  return {
    supabaseUrl,
    serviceRoleKey,
    cronSecret,
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  }
}

async function processDelivery(
  client: ReturnType<typeof serviceClient>,
  delivery: CalendarPushDelivery,
  env: Environment
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

  const result = await sendCalendarPush(delivery, {
    subject: env.vapidSubject,
    publicKey: env.vapidPublicKey,
    privateKey: env.vapidPrivateKey
  })
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
  client: ReturnType<typeof serviceClient>,
  deliveries: CalendarPushDelivery[],
  env: Environment
) {
  const batchSize = 10
  for (let index = 0; index < deliveries.length; index += batchSize) {
    const results = await Promise.allSettled(
      deliveries
        .slice(index, index + batchSize)
        .map((delivery) => processDelivery(client, delivery, env))
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

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  const env = environment()
  if (!env) return new Response(null, { status: 500 })
  if (!secureEqual(request.headers.get('x-calendar-cron-secret'), env.cronSecret))
    return new Response(null, { status: 401 })

  const client = serviceClient(env.supabaseUrl, env.serviceRoleKey)
  const { data, error } = await client.rpc('calendar_claim_due_push_deliveries', {})
  if (error) {
    console.error('calendar push claim failed', { errorClass: 'claim_failed' })
    return Response.json({ ok: false }, { status: 500 })
  }
  const deliveries = (data ?? []) as CalendarPushDelivery[]
  await processInBatches(client, deliveries, env)
  return Response.json({ ok: true, claimed: deliveries.length })
})
