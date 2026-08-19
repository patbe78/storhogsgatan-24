import { expect, test, type Page } from '@playwright/test'
import { householdId, login, userId } from './calendar-fixture'

const workCategoryId = '33333333-3333-4333-8333-333333333333'
const felixId = '22222222-2222-4222-8222-222222222222'

const workCategory = {
  id: workCategoryId,
  household_id: householdId,
  name: 'Arbete',
  icon: 'briefcase',
  color: '#2563eb',
  is_archived: false,
  is_system: true
}

function calendarEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    household_id: householdId,
    title: 'Befintlig aktivitet',
    description: '',
    location: null,
    notes: null,
    category_id: workCategoryId,
    category_name: 'Arbete',
    category_color: '#2563eb',
    created_by: userId,
    updated_by: userId,
    starts_at: '2026-08-18T04:00:00.000Z',
    ends_at: '2026-08-18T12:00:00.000Z',
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
    participants: [{ id: userId, name: 'Patrik', color: '#2563eb' }],
    recurrence: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides
  }
}

async function openQuickEntry(page: Page) {
  await page.getByRole('link', { name: 'Kalender' }).click()
  await page.getByRole('button', { name: /Jobbpass/ }).click()
  return page.getByRole('dialog', { name: 'Lägg till jobbpass' })
}

test('jobbpass har fokuserade standardvärden och kan spara flera pass i samma session', async ({
  page
}) => {
  await login(page, { calendarCategories: [workCategory] })
  const dialog = await openQuickEntry(page)

  await expect(dialog.getByLabel('Titel *')).toHaveValue('Jobb')
  await expect(dialog.getByLabel('Startdatum *')).toHaveValue('2026-08-19')
  await expect(dialog.getByLabel('Starttid *')).toHaveValue('09:00')
  await expect(dialog.getByLabel('Sluttid *')).toHaveValue('17:00')
  await expect(dialog.getByRole('group', { name: 'Deltagare *' })).toContainText('Patrik')
  await expect(dialog.getByRole('button', { name: /timmar$/ })).toHaveCount(5)
  await expect(dialog.getByText('Kategori')).toHaveCount(0)
  await expect(dialog.getByText('Plats')).toHaveCount(0)
  await expect(dialog.getByText('Påminnelser')).toHaveCount(0)
  await expect(dialog.getByText('Anteckning')).toHaveCount(0)

  await dialog.getByLabel('Titel *').fill('Nattpass')
  await dialog.getByLabel('Startdatum *').fill('2026-08-21')
  await dialog.getByLabel('Starttid *').fill('21:30')
  await dialog.getByLabel('Sluttid *').fill('05:30')
  await expect(dialog.getByText('Faktisk varaktighet: 8 timmar')).toBeVisible()

  const firstSave = page.waitForRequest((request) =>
    request.url().includes('/rpc/calendar_save_event')
  )
  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()
  const firstPayload = (await firstSave).postDataJSON().p_payload
  expect(firstPayload).toMatchObject({
    title: 'Nattpass',
    categoryId: workCategoryId,
    location: '',
    notes: '',
    reminderOffsetsMinutes: [],
    participantIds: [userId]
  })
  expect(Date.parse(firstPayload.endsAt) - Date.parse(firstPayload.startsAt)).toBe(8 * 60 * 60_000)
  await expect(dialog.getByText('Jobbpass sparat')).toBeVisible()
  await expect(dialog.getByLabel('Titel *')).toHaveValue('Nattpass')
  await expect(dialog.getByLabel('Startdatum *')).toHaveValue('2026-08-21')
  await expect(dialog.getByLabel('Starttid *')).toHaveValue('21:30')
  await expect(dialog.getByLabel('Sluttid *')).toHaveValue('05:30')
  await expect(dialog.getByText('Jobbpass sparat')).toBeHidden({ timeout: 3000 })

  await dialog.getByLabel('Startdatum *').fill('2026-08-22')
  const secondSave = page.waitForRequest((request) =>
    request.url().includes('/rpc/calendar_save_event')
  )
  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()
  await secondSave
  await expect(dialog.getByText('Jobbpass sparat')).toBeVisible()
  await dialog.getByRole('button', { name: 'Avsluta inmatning' }).click()
  await expect(dialog).toHaveCount(0)

  const workFilter = page.getByLabel('Patrik – Arbete – visas')
  await expect(page.getByRole('button', { name: /^Nattpass,/ })).toHaveCount(2)
  await workFilter.uncheck()
  await expect(page.getByRole('button', { name: /^Nattpass,/ })).toHaveCount(0)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText('Nattpass').first()).toBeVisible()
})

test('konflikt per deltagare kräver aktiv bekräftelse och bevarar formuläret vid Avbryt', async ({
  page
}) => {
  const asaId = '44444444-4444-4444-8444-444444444444'
  await login(page, {
    calendarCategories: [workCategory],
    calendarProfiles: [
      { id: userId, name: 'Patrik', color: '#2563eb' },
      { id: asaId, name: 'Åsa', color: '#db2777' }
    ],
    calendarEvents: [
      calendarEvent({
        participants: [
          { id: userId, name: 'Patrik', color: '#2563eb' },
          { id: asaId, name: 'Åsa', color: '#db2777' }
        ]
      })
    ]
  })
  const dialog = await openQuickEntry(page)
  await dialog.getByLabel('Startdatum *').fill('2026-08-18')
  await dialog.getByLabel('Starttid *').fill('06:00')
  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  const participantSheet = page.getByRole('dialog', { name: 'Deltagare' })
  await participantSheet.getByLabel('Åsa').check()
  await participantSheet.getByRole('button', { name: 'Klar' }).click()

  let saves = 0
  page.on('request', (request) => {
    if (request.url().includes('/rpc/calendar_save_event')) saves += 1
  })
  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()
  const warning = page.getByRole('dialog', { name: 'Överlappande jobbpass' })
  await expect(warning).toContainText('Patrik och Åsa')
  expect(saves).toBe(0)
  await warning.getByRole('button', { name: 'Avbryt' }).click()
  await expect(warning).toHaveCount(0)
  await expect(dialog.getByLabel('Startdatum *')).toHaveValue('2026-08-18')
  await expect(dialog.getByLabel('Starttid *')).toHaveValue('06:00')

  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()
  const forcedSave = page.waitForRequest((request) =>
    request.url().includes('/rpc/calendar_save_event')
  )
  await warning.getByRole('button', { name: 'Spara ändå' }).click()
  await forcedSave
  await expect(dialog.getByText('Jobbpass sparat')).toBeVisible()
  expect(saves).toBe(1)
})

test('återkommande faktisk occurrence orsakar konflikt för rätt deltagare', async ({ page }) => {
  await login(page, {
    calendarCategories: [workCategory],
    calendarProfiles: [
      { id: userId, name: 'Patrik', color: '#2563eb' },
      { id: felixId, name: 'Felix', color: '#16a34a' }
    ],
    calendarEvents: [
      calendarEvent({
        starts_at: '2026-08-12T06:00:00.000Z',
        ends_at: '2026-08-12T14:00:00.000Z',
        recurrence_series_id: '55555555-5555-4555-8555-555555555555',
        participants: [{ id: felixId, name: 'Felix', color: '#16a34a' }],
        recurrence: {
          id: '55555555-5555-4555-8555-555555555555',
          frequency: 'weekly',
          interval_value: 1,
          starts_on: '2026-08-12',
          ends_on: null,
          occurrence_count: null,
          parent_series_id: null,
          split_from_date: null
        }
      })
    ]
  })
  const dialog = await openQuickEntry(page)
  await dialog.getByLabel('Startdatum *').fill('2026-08-19')
  await dialog.getByLabel('Starttid *').fill('12:00')
  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  const participantSheet = page.getByRole('dialog', { name: 'Deltagare' })
  await participantSheet.getByLabel('Patrik').uncheck()
  await participantSheet.getByLabel('Felix').check()
  await participantSheet.getByRole('button', { name: 'Klar' }).click()
  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()

  await expect(page.getByRole('dialog', { name: 'Överlappande jobbpass' })).toContainText('Felix')
})

test('save-fel lämnar alla värden kvar och visar ingen success', async ({ page }) => {
  await login(page, { calendarCategories: [workCategory], calendarSaveFailures: 1 })
  const dialog = await openQuickEntry(page)
  await dialog.getByLabel('Titel *').fill('Extra pass')
  await dialog.getByLabel('Startdatum *').fill('2026-08-20')
  await dialog.getByRole('button', { name: 'Spara', exact: true }).click()

  await expect(dialog.getByRole('alert')).toBeVisible()
  await expect(dialog.getByText('Jobbpass sparat')).toHaveCount(0)
  await expect(dialog.getByLabel('Titel *')).toHaveValue('Extra pass')
  await expect(dialog.getByLabel('Startdatum *')).toHaveValue('2026-08-20')
  await expect(dialog.getByRole('button', { name: 'Spara', exact: true })).toBeEnabled()
})
