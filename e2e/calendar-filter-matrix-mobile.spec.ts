import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

const householdId = '24000000-0000-4000-8000-000000000024'
const patrikId = '11111111-1111-4111-8111-111111111111'

test('matrisen rullar horisontellt utan page overflow eller scroll-lock', async ({ page }) => {
  const categories = Array.from({ length: 8 }, (_, index) => ({
    id: `aaaaaaaa-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
    household_id: householdId,
    name: `Lång kategori ${index + 1}`,
    icon: null,
    color: null,
    is_archived: false,
    is_system: false
  }))
  const profiles = Array.from({ length: 5 }, (_, index) => ({
    id: index === 0 ? patrikId : `bbbbbbbb-2222-4222-8222-${String(index).padStart(12, '0')}`,
    name: index === 0 ? 'Patrik' : `Familjemedlem med långt namn ${index}`,
    color: '#2563eb'
  }))
  await login(page, { calendarCategories: categories, calendarProfiles: profiles })
  await page.getByRole('button', { name: 'Öppna meny' }).click()
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()
  await page.getByRole('button', { name: 'Visa filter' }).click()

  const matrix = page.locator('.calendar-filter-matrix__scroll')
  await expect(matrix).toBeVisible()
  await expect
    .poll(() => matrix.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(true)
  await matrix.evaluate((element) => {
    element.scrollLeft = element.scrollWidth
  })
  await expect.poll(() => matrix.evaluate((element) => element.scrollLeft > 0)).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true)

  const memberHeading = page.getByRole('rowheader', { name: /Familjemedlem med långt namn 1/ })
  await expect
    .poll(() => memberHeading.evaluate((element) => getComputedStyle(element).position))
    .toBe('sticky')
  await page.getByLabel('Patrik – Ingen kategori – visas').uncheck()
  await expect(page.getByLabel('Patrik – Ingen kategori – döljs')).not.toBeChecked()
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY > 0)).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(() => ({
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
        locked: document.documentElement.classList.contains('calendar-scroll-locked')
      }))
    )
    .toEqual({ body: '', html: '', locked: false })
})
