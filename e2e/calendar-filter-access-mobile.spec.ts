import { expect, test, type Page } from '@playwright/test'
import { householdId, login, userId } from './calendar-fixture'

function eventRow(index: number): Record<string, unknown> {
  const day = String(1 + (index % 28)).padStart(2, '0')
  return {
    id: `filter-access-${index}`,
    household_id: householdId,
    title: `Aktivitet ${index + 1}`,
    description: '',
    location: null,
    notes: null,
    category_id: null,
    category_name: null,
    category_color: null,
    created_by: userId,
    updated_by: userId,
    starts_at: `2026-08-${day}T10:00:00.000Z`,
    ends_at: `2026-08-${day}T11:00:00.000Z`,
    all_day: false,
    all_day_start: null,
    all_day_end: null,
    is_family_event: false,
    reminder_offsets_minutes: [],
    external_source: null,
    external_id: null,
    recurrence_series_id: null,
    participants: [{ id: userId, name: 'Patrik', color: '#2563eb' }],
    recurrence: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z'
  }
}

async function boxesDoNotOverlap(page: Page, first: string, second: string) {
  return page.evaluate(
    ({ firstSelector, secondSelector }) => {
      const firstBox = document.querySelector(firstSelector)!.getBoundingClientRect()
      const secondBox = document.querySelector(secondSelector)!.getBoundingClientRect()
      return !(
        firstBox.left < secondBox.right &&
        firstBox.right > secondBox.left &&
        firstBox.top < secondBox.bottom &&
        firstBox.bottom > secondBox.top
      )
    },
    { firstSelector: first, secondSelector: second }
  )
}

for (const scenario of [
  { name: 'kort månad', events: [] },
  { name: 'lång månad', events: Array.from({ length: 24 }, (_, index) => eventRow(index)) }
]) {
  test(`Ny aktivitet blockerar inte filter eller kategorier på iPhone – ${scenario.name}`, async ({
    page
  }) => {
    await login(page, { calendarEvents: scenario.events })
    await page.getByRole('button', { name: 'Öppna meny' }).click()
    await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()

    const filterSection = page.locator('.calendar-filter-section')
    await filterSection.evaluate((element) => element.scrollIntoView({ block: 'end' }))
    const filterButton = page.getByRole('button', { name: 'Visa filter' })
    await expect(filterButton).toBeVisible()
    await expect
      .poll(() => boxesDoNotOverlap(page, '.mobile-filter-button', '.new-event-button'))
      .toBe(true)
    await filterButton.click()
    await expect(page.getByLabel('Filtermatris för kalender')).toBeVisible()

    const categories = page.getByRole('button', { name: 'Hantera kategorier' })
    await categories.evaluate((element) => element.scrollIntoView({ block: 'end' }))
    await expect(categories).toBeVisible()
    await expect
      .poll(() => boxesDoNotOverlap(page, '.manage-categories', '.new-event-button'))
      .toBe(true)
    await categories.click()
    await expect(page.getByRole('dialog', { name: 'Hantera kategorier' })).toBeVisible()
    await page.getByRole('dialog', { name: 'Hantera kategorier' }).getByLabel('Stäng').click()

    const createButton = page.getByRole('button', { name: 'Ny aktivitet' })
    await expect(createButton).toBeVisible()
    const layout = await page.evaluate(() => {
      const button = document.querySelector('.new-event-button')!.getBoundingClientRect()
      return {
        buttonInside:
          button.left >= 0 &&
          button.top >= 0 &&
          button.right <= document.documentElement.clientWidth &&
          button.bottom <= window.innerHeight,
        noHorizontalOverflow:
          document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      }
    })
    expect(layout).toEqual({ buttonInside: true, noHorizontalOverflow: true })

    await page.setViewportSize({ width: 844, height: 390 })
    await expect(createButton).toBeVisible()
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
        )
      )
      .toBe(true)
  })
}
