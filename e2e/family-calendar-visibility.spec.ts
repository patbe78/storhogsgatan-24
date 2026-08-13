import { expect, test, type Page } from '@playwright/test'
import { householdId, login, type CalendarFixtureOptions } from './calendar-fixture'

const patrik = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Patrik',
  email: 'patrik@test.invalid',
  color: '#2563eb'
}
const asa = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Åsa',
  email: 'asa@test.invalid',
  color: '#db2777'
}
const felix = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Felix',
  email: 'felix@test.invalid',
  color: '#16a34a'
}
const workId = '10000000-0000-4000-8000-000000000001'
const schoolId = '10000000-0000-4000-8000-000000000003'

const categories = [
  {
    id: workId,
    household_id: householdId,
    name: 'Arbete',
    icon: 'briefcase',
    color: '#2563eb',
    is_archived: false,
    is_system: true
  },
  {
    id: schoolId,
    household_id: householdId,
    name: 'Skola',
    icon: null,
    color: '#f59e0b',
    is_archived: false,
    is_system: false
  }
]

function row(
  id: string,
  title: string,
  startsAt: string,
  categoryId: string | null,
  owner: typeof patrik
): Record<string, unknown> {
  return {
    id,
    household_id: householdId,
    title,
    description: '',
    location: null,
    notes: null,
    category_id: categoryId,
    category_name: categoryId === workId ? 'Arbete' : categoryId === schoolId ? 'Skola' : null,
    category_color: categoryId === workId ? '#2563eb' : categoryId === schoolId ? '#f59e0b' : null,
    created_by: owner.id,
    updated_by: owner.id,
    starts_at: startsAt,
    ends_at: new Date(new Date(startsAt).getTime() + 3600000).toISOString(),
    all_day: false,
    all_day_start: null,
    all_day_end: null,
    is_family_event: false,
    reminder_offsets_minutes: [],
    external_source: null,
    external_id: null,
    recurrence_series_id: null,
    participants: [{ id: owner.id, name: owner.name, color: owner.color }],
    recurrence: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z'
  }
}

const events = [
  row('felix-current', 'Felix dag', '2026-08-12T05:00:00.000Z', workId, felix),
  row('patrik-current', 'Patrik dag', '2026-08-12T06:00:00.000Z', workId, patrik),
  row('asa-current', 'Åsa kväll', '2026-08-13T12:00:00.000Z', workId, asa),
  row('patrik-school', 'Patrik utbildning', '2026-08-14T09:00:00.000Z', schoolId, patrik),
  row('asa-none', 'Åsa utan kategori', '2026-08-15T10:00:00.000Z', null, asa),
  row('felix-next', 'Felix natt', '2026-08-18T19:00:00.000Z', workId, felix),
  row('patrik-next', 'Patrik nästa', '2026-08-18T06:00:00.000Z', workId, patrik),
  row('asa-next', 'Åsa nästa', '2026-08-19T12:00:00.000Z', workId, asa)
]

const profiles = [patrik, asa, felix].map(({ id, name, color }) => ({ id, name, color }))
const dashboardProfiles: NonNullable<CalendarFixtureOptions['dashboardProfiles']> = [
  { ...patrik, role: 'admin', is_active: true },
  { ...asa, role: 'adult', is_active: true },
  { ...felix, role: 'member', is_active: true }
]
const showAllRelevant = [
  { participant_profile_id: felix.id, category_id: workId },
  { participant_profile_id: patrik.id, category_id: workId },
  { participant_profile_id: asa.id, category_id: workId },
  { participant_profile_id: patrik.id, category_id: schoolId },
  { participant_profile_id: asa.id, category_id: null }
]

function options(currentUser: typeof patrik, role: 'admin' | 'adult' | 'member') {
  return {
    currentUser,
    role,
    calendarEvents: events,
    calendarCategories: categories,
    calendarProfiles: profiles,
    dashboardProfiles,
    calendarDefaultEntries: showAllRelevant
  } satisfies CalendarFixtureOptions
}

function card(page: Page, name: RegExp) {
  return page.getByRole('heading', { name }).locator('..').locator('..')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(`
    const RealDate = Date;
    const fixed = ${new Date('2026-08-11T10:00:00.000Z').getTime()};
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  `)
})

test('Felix ser household-events och filtermatrisen styr temporär synlighet', async ({ page }) => {
  await login(page, options(felix, 'member'))
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()

  for (const title of [
    'Felix dag',
    'Patrik dag',
    'Åsa kväll',
    'Patrik utbildning',
    'Åsa utan kategori'
  ])
    await expect(page.getByText(title, { exact: true })).toBeVisible()

  await expect(page.getByLabel('Felix – Arbete – visas')).toBeChecked()
  await expect(page.getByLabel('Patrik – Arbete – visas')).toBeChecked()
  await expect(page.getByLabel('Åsa – Ingen kategori – visas')).toBeChecked()
  await page.getByRole('button', { name: 'Avmarkera alla kategorier för Patrik' }).click()
  await expect(page.getByText('Patrik dag', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Patrik utbildning', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Åsa kväll', { exact: true })).toBeVisible()
  await expect(page.getByText('Åsa utan kategori', { exact: true })).toBeVisible()

  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Inköpslista' }).click()
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Arbete – visas')).toBeChecked()
  await expect(page.getByText('Patrik dag', { exact: true })).toBeVisible()
})

test('Felix dashboard skiljer egna och vuxnas arbetstider aktuell och nästa vecka', async ({
  page
}) => {
  await login(page, options(felix, 'member'))

  const myWork = card(page, /^Mina arbetstider/)
  const family = card(page, /^Familjens arbetstider/)
  await expect(myWork.getByRole('link', { name: /Felix dag/ })).toBeVisible()
  await expect(myWork.getByRole('link', { name: /Patrik|Åsa/ })).toHaveCount(0)
  await expect(family.getByRole('link', { name: /Patrik.*Patrik dag/ })).toBeVisible()
  await expect(family.getByRole('link', { name: /Åsa.*Åsa kväll/ })).toBeVisible()
  await expect(family.getByRole('link', { name: /Felix dag/ })).toHaveCount(0)

  await myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()
  await family.getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' }).click()
  await expect(myWork.getByRole('link', { name: /Felix natt/ })).toBeVisible()
  await expect(family.getByRole('link', { name: /Patrik.*Patrik nästa/ })).toBeVisible()
  await expect(family.getByRole('link', { name: /Åsa.*Åsa nästa/ })).toBeVisible()
  await expect(family.getByRole('link', { name: /Felix natt/ })).toHaveCount(0)
})

test('defaultfilter och query-state läcker inte vid login-switch Patrik till Felix', async ({
  page
}) => {
  await login(page, {
    ...options(patrik, 'admin'),
    calendarDefaultEntries: [{ participant_profile_id: patrik.id, category_id: workId }]
  })
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Arbete – visas')).toBeChecked()
  await expect(page.getByLabel('Felix – Arbete – döljs')).not.toBeChecked()
  await page.getByRole('button', { name: 'Logga ut' }).click()

  await login(page, options(felix, 'member'))
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Felix – Arbete – visas')).toBeChecked()
  await expect(page.getByLabel('Åsa – Ingen kategori – visas')).toBeChecked()
  await expect(page.getByText('Patrik dag', { exact: true })).toBeVisible()
  await expect(page.getByText('Åsa utan kategori', { exact: true })).toBeVisible()
})
