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
    title: 'Jobb',
    category_id: 'work',
    category_name: 'Arbete',
    category_color: '#2563eb'
  }),
  eventRow({
    id: 'timed-long',
    title: 'Längre tidsbestämd aktivitet samma dag',
    starts_at: '2026-08-10T12:00:00.000Z',
    ends_at: '2026-08-10T13:00:00.000Z',
    category_id: 'work',
    category_name: 'Arbete',
    category_color: '#2563eb'
  }),
  eventRow({
    id: 'all-day',
    title: 'Åsa sjukskriven 50%',
    starts_at: null,
    ends_at: null,
    all_day: true,
    all_day_start: '2026-08-06',
    all_day_end: '2026-08-11',
    category_id: 'trip',
    category_name: 'Resa',
    category_color: '#f97316'
  }),
  eventRow({
    id: 'all-day-city',
    title: 'Karlstad',
    starts_at: null,
    ends_at: null,
    all_day: true,
    all_day_start: '2026-08-12',
    all_day_end: '2026-08-12',
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
  const timed = page.getByRole('button', { name: /Jobb/ })
  const allDay = page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ }).first()
  await expect(timed).toBeVisible()
  await expect(page.getByRole('button', { name: /Längre tidsbestämd aktivitet/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Karlstad.*Heldagsaktivitet/ })).toBeVisible()
  await expect(timed).toHaveClass(/month-event-typography/)
  await expect(allDay).toHaveClass(/month-event-typography/)
  const [timedTypography, allDayTypography] = await Promise.all(
    [timed, allDay].map((locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: getComputedStyle(element.querySelector('strong')!).fontWeight
        }
      })
    )
  )
  expect(timedTypography).toEqual(allDayTypography)

  const segments = page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ })
  await expect(segments).toHaveCount(2)
  await segments.first().click()
  await expect(page.getByRole('dialog', { name: 'Åsa sjukskriven 50%' })).toBeVisible()
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

  await page.getByRole('button', { name: 'Avmarkera allt', exact: true }).click()
  await page.getByLabel('Patrik – Arbete – döljs').check()
  await expect(page.getByRole('button', { name: /Jobb/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ })
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Karlstad.*Heldagsaktivitet/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Välj allt', exact: true }).click()
  await expect(
    page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ })
  ).toHaveCount(2)
  await expect(page.getByRole('button', { name: /Karlstad.*Heldagsaktivitet/ })).toBeVisible()
})
