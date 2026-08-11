import { test, expect } from '@playwright/test'
import { login } from './calendar-fixture'

test('auth, session, navigation och kompakt kalenderformulär fungerar', async ({ page }) => {
  await login(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Välkommen Patrik' })).toBeVisible()
  await page.getByRole('link', { name: 'Inställningar' }).click()
  await expect(page.getByText('Version').locator('..')).toContainText('0.7.0')
  await page.getByRole('link', { name: 'Kalender' }).click()
  await expect(page.getByRole('button', { name: 'Månad' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Ny aktivitet/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ny aktivitet' })
  await expect(dialog).toBeVisible()
  await expect(page.getByLabel('Titel *')).toBeFocused()
  await expect(dialog.getByLabel('Startdatum *')).toBeVisible()
  await expect(dialog.getByLabel('Starttid *')).toBeVisible()
  await expect(dialog.getByLabel('Varaktighet *')).toContainText('1 timme')
  await expect(dialog.getByLabel('Beskrivning')).toHaveCount(0)
  await expect(dialog.getByText('Extern referens')).toHaveCount(0)
  await expect(dialog.getByLabel('Sluttid *')).toHaveCount(0)

  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  const participantSheet = page.getByRole('dialog', { name: 'Deltagare' })
  await expect(participantSheet.getByLabel('Hela familjen')).toBeVisible()
  await participantSheet.getByRole('button', { name: 'Klar' }).click()

  await dialog.getByRole('button', { name: 'Ingen påminnelse' }).click()
  const reminderSheet = page.getByRole('dialog', { name: 'Påminnelser' })
  await reminderSheet.getByLabel('15 minuter före', { exact: true }).check()
  await reminderSheet.getByLabel('2 dagar före', { exact: true }).check()
  await reminderSheet.getByRole('button', { name: 'Klar' }).click()
  await expect(dialog.getByRole('button', { name: '15 min + 2 dagar' })).toBeVisible()

  await page.getByLabel('Heldagsaktivitet').check()
  await expect(dialog.getByLabel('Starttid *')).toHaveCount(0)
  await expect(dialog.getByLabel('Varaktighet *')).toHaveCount(0)
  await expect(dialog.getByLabel('Slutdatum *')).toBeVisible()
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
