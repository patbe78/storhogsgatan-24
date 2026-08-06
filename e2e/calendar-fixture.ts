import { expect, type Page } from '@playwright/test'

const userId = '11111111-1111-4111-8111-111111111111'
const householdId = '24000000-0000-4000-8000-000000000024'
const user = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'patrik@test.invalid',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z'
}
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
const jwt = () =>
  `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.`

export async function mockSupabase(
  page: Page,
  profileOptions: { role?: 'admin' | 'adult' | 'member' | 'guest'; isActive?: boolean } = {}
) {
  await page.route('**/auth/v1/**', async (route) => {
    const url = route.request().url()
    if (url.includes('/token'))
      return route.fulfill({
        json: {
          access_token: jwt(),
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'refresh-test',
          user
        }
      })
    if (url.includes('/user')) return route.fulfill({ json: user })
    return route.fulfill({ json: {} })
  })
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = request.url()
    if (url.includes('/rpc/calendar_events_in_range') || url.includes('/calendar_categories'))
      return route.fulfill({ json: [] })
    if (url.includes('/profiles')) {
      const profile = {
        id: userId,
        name: 'Patrik',
        email: user.email,
        role: profileOptions.role ?? 'admin',
        avatar_url: null,
        color: '#2563eb',
        household_id: householdId,
        is_active: profileOptions.isActive ?? true,
        deactivated_at: profileOptions.isActive === false ? '2026-08-06T00:00:00Z' : null,
        deactivated_by: profileOptions.isActive === false ? userId : null,
        created_at: '',
        updated_at: ''
      }
      return route.fulfill({
        json: url.includes('id=eq.')
          ? profile
          : [{ id: profile.id, name: profile.name, color: profile.color }]
      })
    }
    return route.fulfill({ json: [] })
  })
}

export async function login(
  page: Page,
  profileOptions: { role?: 'admin' | 'adult' | 'member' | 'guest'; isActive?: boolean } = {}
) {
  await mockSupabase(page, profileOptions)
  await page.goto('/login')
  await page.getByLabel('E-post').fill('patrik@test.invalid')
  await page.getByLabel('Lösenord').fill('testlösenord')
  await page.getByRole('button', { name: 'Logga in' }).click()
  await expect(page.getByRole('heading', { name: 'Välkommen Patrik' })).toBeVisible()
  const onboarding = page.getByRole('dialog', { name: 'Se familjens kalender' })
  if (await onboarding.isVisible()) {
    await onboarding.getByRole('button', { name: 'Hoppa över', exact: true }).click()
  }
}
