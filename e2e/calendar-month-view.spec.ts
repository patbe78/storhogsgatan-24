import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

const participant = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Patrik',
  color: '#2563eb'
}

function eventRow(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    household_id: '24000000-0000-4000-8000-000000000024',
    title: 'Aktivitet',
    description: '',
    location: null,
    notes: null,
    category_id: null,
    category_name: null,
    category_color: null,
    created_by: participant.id,
    updated_by: participant.id,
    starts_at: '2026-08-10T10:00:00.000Z',
    ends_at: '2026-08-10T11:00:00.000Z',
    all_day: false,
    all_day_start: null,
    all_day_end: null,
    is_family_event: false,
    reminder_offsets_minutes: [],
    external_source: null,
    external_id: null,
    recurrence_series_id: null,
    participants: [participant],
    recurrence: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides
  }
}

const categories = [
  { id: 'work', household_id: 'household', name: 'Arbete', color: '#2563eb', is_archived: false },
  { id: 'trip', household_id: 'household', name: 'Resa', color: '#f97316', is_archived: false }
]

const calendarEvents = [
  eventRow({
    id: 'timed',
    title: 'Vanligt möte',
    category_id: 'work',
    category_name: 'Arbete',
    category_color: '#2563eb'
  }),
  eventRow({
    id: 'all-day',
    title: 'Semesterresa',
    starts_at: null,
    ends_at: null,
    all_day: true,
    all_day_start: '2026-08-06',
    all_day_end: '2026-08-11',
    category_id: 'trip',
    category_name: 'Resa',
    category_color: '#f97316'
  })
]

test('månadsvyn navigerar, segmenterar, öppnar aktiviteter och filtrerar i rätt ordning', async ({
  page
}) => {
  await login(page, { calendarEvents, calendarCategories: categories })
  await page.goto('/kalender?date=2026-08-10')

  const monthHeading = page.getByRole('heading', { name: 'Augusti 2026', exact: true })
  await expect(monthHeading).toBeVisible()
  await expect(page.getByLabel('Vecka 32')).toContainText('v32')
  await expect(page.getByRole('button', { name: /Vanligt möte/ })).toBeVisible()

  const segments = page.getByRole('button', { name: /Semesterresa.*Heldagsaktivitet/ })
  await expect(segments).toHaveCount(2)
  await segments.first().click()
  await expect(page.getByRole('dialog', { name: 'Semesterresa' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Nästa period' }).click()
  await expect(page.getByRole('heading', { name: 'September 2026', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Föregående period' }).click()
  await expect(monthHeading).toBeVisible()
  await page.getByRole('button', { name: 'Idag' }).click()
  const todayTitle = new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(
    new Date()
  )
  await expect(
    page.getByRole('heading', {
      name: todayTitle.replace(/^./u, (letter) => letter.toLocaleUpperCase('sv-SE')),
      exact: true
    })
  ).toBeVisible()

  await page.goto('/kalender?date=2026-08-10')
  const filterHeading = page.getByRole('heading', { name: 'Filter', exact: true })
  const manageCategories = page.getByRole('button', { name: 'Hantera kategorier' })
  await expect(filterHeading).toBeVisible()
  await expect(manageCategories).toBeVisible()
  expect(
    await filterHeading.evaluate(
      (filter, manage) =>
        Boolean(filter.compareDocumentPosition(manage) & Node.DOCUMENT_POSITION_FOLLOWING),
      await manageCategories.elementHandle()
    )
  ).toBe(true)

  await page.getByText('Kategorier', { exact: true }).click()
  await page.getByLabel('Arbete').check()
  await expect(page.getByRole('button', { name: /Vanligt möte/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Semesterresa.*Heldagsaktivitet/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rensa filter' }).click()
  await expect(page.getByRole('button', { name: /Semesterresa.*Heldagsaktivitet/ })).toHaveCount(2)
})
