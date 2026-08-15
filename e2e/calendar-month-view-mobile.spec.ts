import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

const allDayEvent = {
  id: 'mobile-all-day',
  household_id: '24000000-0000-4000-8000-000000000024',
  title: 'Åsa sjukskriven 50%',
  description: '',
  location: null,
  notes: null,
  category_id: null,
  category_name: null,
  category_color: null,
  created_by: '11111111-1111-4111-8111-111111111111',
  updated_by: '11111111-1111-4111-8111-111111111111',
  starts_at: null,
  ends_at: null,
  all_day: true,
  all_day_start: '2026-08-06',
  all_day_end: '2026-08-18',
  is_family_event: true,
  reminder_offsets_minutes: [],
  external_source: null,
  external_id: null,
  recurrence_series_id: null,
  participants: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Patrik', color: '#2563eb' }],
  recurrence: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z'
}

const calendarEvents = [
  allDayEvent,
  {
    ...allDayEvent,
    id: 'mobile-city',
    title: 'Karlstad',
    all_day_start: '2026-08-12',
    all_day_end: '2026-08-12'
  },
  {
    ...allDayEvent,
    id: 'mobile-timed',
    title: 'Jobb',
    starts_at: '2026-08-10T10:00:00.000Z',
    ends_at: '2026-08-10T11:00:00.000Z',
    all_day: false,
    all_day_start: null,
    all_day_end: null
  },
  {
    ...allDayEvent,
    id: 'mobile-timed-long',
    title: 'Längre tidsbestämd aktivitet samma dag',
    starts_at: '2026-08-10T12:00:00.000Z',
    ends_at: '2026-08-10T13:00:00.000Z',
    all_day: false,
    all_day_start: null,
    all_day_end: null
  }
]

test('månadsvyn använder mobilbredden utan overflow och har sticky rubrik', async ({ page }) => {
  await login(page, { calendarEvents })
  await page.goto('/kalender?date=2026-08-10')

  await expect(page.getByRole('heading', { name: 'Augusti 2026', exact: true })).toBeVisible()
  await expect(page.getByLabel('Vecka 32')).toContainText('v32')
  await expect(
    page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ })
  ).toHaveCount(3)
  await expect(page.getByRole('button', { name: /Karlstad.*Heldagsaktivitet/ })).toBeVisible()
  const timed = page.getByRole('button', { name: /Jobb/ })
  const allDay = page.getByRole('button', { name: /Åsa sjukskriven 50%.*Heldagsaktivitet/ }).first()
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
  expect(
    await page
      .locator('.month-event-typography')
      .evaluateAll((elements) =>
        elements.every((element) => element.scrollHeight <= element.clientHeight)
      )
  ).toBe(true)

  const layout = await page.evaluate(() => {
    const calendar = document.querySelector('.month-calendar')!.getBoundingClientRect()
    return {
      calendarLeft: calendar.left,
      calendarRight: calendar.right,
      viewportWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }
  })
  expect(layout.calendarLeft).toBeLessThanOrEqual(1)
  expect(layout.calendarRight).toBeGreaterThanOrEqual(layout.viewportWidth - 1)
  expect(layout.overflow).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: 'Visa filter' }).click()
  await expect(page.getByLabel('Filtermatris för kalender')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 500))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(250)
  const stickyTop = await page
    .locator('.month-calendar__header')
    .evaluate((element) => element.getBoundingClientRect().top)
  expect(stickyTop).toBeGreaterThanOrEqual(63)
  expect(stickyTop).toBeLessThanOrEqual(66)

  await expect(page.getByRole('button', { name: 'Hantera kategorier' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.body.scrollWidth <= window.innerWidth))
    .toBe(true)
})
