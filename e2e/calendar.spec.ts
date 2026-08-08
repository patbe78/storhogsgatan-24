import { test, expect } from '@playwright/test'
import { login } from './calendar-fixture'

test('auth, session, navigation och kalenderformulär fungerar med isolerad Supabase-fixture', async ({
  page
}) => {
  await login(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Välkommen Patrik' })).toBeVisible()
  await page.getByRole('main').getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByRole('button', { name: 'Månad' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Ny aktivitet/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ny aktivitet' })
  const title = page.getByLabel('Titel *')
  const description = page.getByLabel('Beskrivning', { exact: true })
  await expect(dialog).toBeVisible()
  await expect(title).toBeFocused()
  await expect(description).not.toHaveAttribute('required', '')
  await expect(description).toHaveAttribute('rows', '2')
  await expect(dialog.getByRole('group', { name: 'Start' })).toBeVisible()
  await expect(dialog.getByRole('group', { name: 'Slut' })).toBeVisible()
  await expect(dialog.getByLabel('Hela familjen')).toBeVisible()

  const initialDescriptionHeight = await description.evaluate((element) => element.clientHeight)
  await description.fill(Array.from({ length: 20 }, (_, index) => `Rad ${index + 1}`).join('\n'))
  const expandedDescriptionHeight = await description.evaluate((element) => element.clientHeight)
  expect(expandedDescriptionHeight).toBeGreaterThan(initialDescriptionHeight)
  expect(expandedDescriptionHeight).toBeLessThanOrEqual(180)

  await page.getByLabel('Heldagsaktivitet').check()
  await page.getByLabel('15 minuter före').check()
  await page.getByLabel('2 dagar före').check()
  await expect(page.getByLabel('15 minuter före')).toBeChecked()
  await expect(page.getByLabel('2 dagar före')).toBeChecked()
  await expect(dialog.locator('input[type="time"]')).toHaveCount(0)
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('logout och protected route fungerar', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Logga ut' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/kalender')
  await expect(page).toHaveURL(/\/login$/)
})
