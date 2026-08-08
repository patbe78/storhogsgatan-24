import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

test('permission begärs först efter informationssteget och aldrig automatiskt vid login', async ({
  page
}) => {
  await page.addInitScript(() => {
    const state = { permissionCalls: 0, subscribeCalls: 0, unsubscribed: false }
    Object.assign(window, { __pushTest: state })
    const subscription = {
      endpoint: 'https://push.test/e2e-device',
      toJSON: () => ({
        endpoint: 'https://push.test/e2e-device',
        keys: { p256dh: 'e2e-public-key-value', auth: 'e2e-auth-secret' }
      }),
      unsubscribe: async () => {
        state.unsubscribed = true
        return true
      }
    }
    let currentSubscription: typeof subscription | null = null
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: async () => {
          state.permissionCalls += 1
          window.Notification.permission = 'granted'
          return 'granted'
        }
      }
    })
    Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} })
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: null,
        ready: Promise.resolve({
          active: { postMessage: () => undefined },
          pushManager: {
            getSubscription: async () => currentSubscription,
            subscribe: async () => {
              state.subscribeCalls += 1
              currentSubscription = subscription
              return subscription
            }
          }
        })
      }
    })
  })

  await login(page)
  expect(
    await page.evaluate(
      () =>
        (window as never as { __pushTest: { permissionCalls: number } }).__pushTest.permissionCalls
    )
  ).toBe(0)
  await page.getByRole('link', { name: 'Inställningar' }).click()
  await page.getByRole('button', { name: 'Aktivera pushnotiser' }).click()
  await expect(page.getByRole('dialog', { name: 'Aktivera kalenderpåminnelser' })).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (window as never as { __pushTest: { permissionCalls: number } }).__pushTest.permissionCalls
    )
  ).toBe(0)
  await page.getByRole('button', { name: 'Fortsätt' }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as never as { __pushTest: { permissionCalls: number } }).__pushTest
            .permissionCalls
      )
    )
    .toBe(1)
  expect(
    await page.evaluate(
      () =>
        (window as never as { __pushTest: { subscribeCalls: number } }).__pushTest.subscribeCalls
    )
  ).toBe(1)
})

test('push-djuplänk positionerar kalendern och öppnar rätt förekomst', async ({ page }) => {
  const eventId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const startsAt = '2027-01-03T17:00:00.000Z'
  const eventKey = `${eventId}:${startsAt}`
  await login(page, {
    calendarEvents: [
      {
        id: eventId,
        household_id: '24000000-0000-4000-8000-000000000024',
        title: 'Djuplänkad träning',
        description: '',
        location: null,
        notes: null,
        category_id: null,
        category_name: null,
        category_color: null,
        created_by: '11111111-1111-4111-8111-111111111111',
        updated_by: '11111111-1111-4111-8111-111111111111',
        starts_at: startsAt,
        ends_at: '2027-01-03T18:00:00.000Z',
        all_day: false,
        all_day_start: null,
        all_day_end: null,
        is_family_event: false,
        reminder_offsets_minutes: [15],
        external_source: null,
        external_id: null,
        recurrence_series_id: null,
        participants: [
          { id: '11111111-1111-4111-8111-111111111111', name: 'Patrik', color: '#2563eb' }
        ],
        recurrence: null,
        created_at: '',
        updated_at: ''
      }
    ]
  })
  await page.goto(`/kalender?date=2027-01-03&event=${encodeURIComponent(eventKey)}`)
  await expect(page.getByRole('heading', { name: 'Djuplänkad träning' })).toBeVisible()
  await expect(page.getByText('januari 2027')).toBeVisible()
})
