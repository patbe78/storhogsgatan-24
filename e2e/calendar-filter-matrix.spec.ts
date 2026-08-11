import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

const patrikId = '11111111-1111-4111-8111-111111111111'
const householdId = '24000000-0000-4000-8000-000000000024'
const workId = 'aaaaaaaa-1111-4111-8111-111111111111'
const work = {
  id: workId,
  household_id: householdId,
  name: 'Arbete',
  icon: null,
  color: '#2563eb',
  is_archived: false,
  is_system: false
}
const uncategorizedEvent = {
  id: 'eeeeeeee-1111-4111-8111-111111111111',
  household_id: householdId,
  title: 'Utan kategori',
  description: '',
  location: null,
  notes: null,
  category_id: null,
  category_name: null,
  category_color: null,
  created_by: patrikId,
  updated_by: patrikId,
  starts_at: '2026-08-11T10:00:00.000Z',
  ends_at: '2026-08-11T11:00:00.000Z',
  all_day: false,
  all_day_start: null,
  all_day_end: null,
  is_family_event: false,
  reminder_offsets_minutes: [],
  reminder_type: 'none',
  reminder_offset_minutes: null,
  external_source: null,
  external_id: null,
  recurrence_series_id: null,
  participants: [{ id: patrikId, name: 'Patrik', color: '#2563eb' }],
  recurrence: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z'
}

test('temporärt filter består mellan vyer men återställs vid återinträde och reload', async ({
  page
}) => {
  await login(page, {
    calendarEvents: [uncategorizedEvent],
    calendarCategories: [work]
  })
  const navigation = page.getByLabel('Huvudnavigering')
  await navigation.getByRole('link', { name: 'Kalender' }).click()

  await page.getByLabel('Patrik – Ingen kategori – visas').uncheck()
  for (const view of ['Vecka', 'Dag', 'Kommande', 'Månad']) {
    await page.getByRole('button', { name: view, exact: true }).click()
    await expect(page.getByLabel('Patrik – Ingen kategori – döljs')).not.toBeChecked()
  }

  await navigation.getByRole('link', { name: 'Inköpslista' }).click()
  await navigation.getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Ingen kategori – visas')).toBeChecked()

  await page.getByLabel('Patrik – Ingen kategori – visas').uncheck()
  await page.reload()
  await expect(page.getByLabel('Patrik – Ingen kategori – visas')).toBeChecked()
})

test('Settings sparar custom-empty separat från system-default och kan återställa visa allt', async ({
  page
}) => {
  await login(page, {
    calendarEvents: [uncategorizedEvent],
    calendarCategories: [work]
  })
  const navigation = page.getByLabel('Huvudnavigering')
  await navigation.getByRole('link', { name: 'Inställningar' }).click()
  const section = page.getByRole('region', { name: 'Standardfilter' })
  await section.getByRole('button', { name: 'Avmarkera allt', exact: true }).click()
  await section.getByRole('button', { name: 'Spara standardfilter' }).click()
  await expect(section.getByText('Standardfiltret har sparats.')).toBeVisible()

  await navigation.getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Ingen kategori – döljs')).not.toBeChecked()
  await expect(page.getByText('Utan kategori', { exact: true })).toHaveCount(0)

  await navigation.getByRole('link', { name: 'Inställningar' }).click()
  await expect(section.getByLabel('Patrik – Ingen kategori – döljs')).not.toBeChecked()
  await section.getByRole('button', { name: 'Återställ till visa allt' }).click()
  await section.getByRole('button', { name: 'Spara standardfilter' }).click()
  await expect(section.getByText('Standardfiltret har sparats.')).toBeVisible()
  await navigation.getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Ingen kategori – visas')).toBeChecked()
})

test('save-fel lämnar tidigare default intakt och ger tydlig feedback', async ({ page }) => {
  await login(page, {
    calendarCategories: [work],
    calendarDefaultEntries: [{ participant_profile_id: patrikId, category_id: null }],
    calendarDefaultSaveFailures: 1
  })
  const navigation = page.getByLabel('Huvudnavigering')
  await navigation.getByRole('link', { name: 'Inställningar' }).click()
  const section = page.getByRole('region', { name: 'Standardfilter' })
  await section.getByLabel('Patrik – Ingen kategori – visas').uncheck()
  await section.getByRole('button', { name: 'Spara standardfilter' }).click()
  await expect(section.getByRole('alert')).toContainText('tidigare sparade filter är oförändrat')

  await navigation.getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByLabel('Patrik – Ingen kategori – visas')).toBeChecked()
  await expect(page.getByLabel('Patrik – Arbete – döljs')).not.toBeChecked()
})
