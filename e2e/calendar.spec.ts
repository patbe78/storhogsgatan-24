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
  await expect(page.getByRole('dialog', { name: 'Ny aktivitet' })).toBeVisible()
  await page.getByLabel('Heldagsaktivitet').check()
  await expect(page.getByLabel('Påminnelse')).toHaveValue('none')
  await expect(page.getByLabel('Starttid *')).toHaveCount(0)
})

test('logout och protected route fungerar', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Logga ut' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/kalender')
  await expect(page).toHaveURL(/\/login$/)
})
