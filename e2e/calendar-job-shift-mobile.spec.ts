import { expect, test } from '@playwright/test'
import { householdId, login } from './calendar-fixture'

test('jobbpass är touchvänligt, kompakt och blockerar inte mobilfiltret', async ({ page }) => {
  await login(page, {
    calendarCategories: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        household_id: householdId,
        name: 'Arbete',
        icon: 'briefcase',
        color: '#2563eb',
        is_archived: false,
        is_system: true
      }
    ]
  })
  await page.getByRole('button', { name: 'Öppna meny' }).click()
  await page.getByLabel('Huvudnavigering').getByRole('link', { name: 'Kalender' }).click()
  const quickButton = page.getByRole('button', { name: /Jobbpass/ })
  await expect(quickButton).toBeVisible()
  await quickButton.click()
  const dialog = page.getByRole('dialog', { name: 'Lägg till jobbpass' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Spara', exact: true })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Avsluta inmatning' })).toBeInViewport()
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true)
  for (const hours of [4, 6, 8, 9, 12]) {
    const box = await dialog.getByRole('button', { name: `${hours} timmar` }).boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }

  await dialog.getByRole('button', { name: 'Avsluta inmatning' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Visa filter' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: 'Visa filter' }).click()
  await expect(page.getByRole('button', { name: 'Dölj filter' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('')
})
