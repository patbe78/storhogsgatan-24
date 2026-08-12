import { test, expect, type Locator } from '@playwright/test'
import { login } from './calendar-fixture'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function expectAllDayDatesStacked(dialog: Locator) {
  const start = await dialog.getByLabel('Startdatum *').boundingBox()
  const end = await dialog.getByLabel('Slutdatum *').boundingBox()
  expect(start).not.toBeNull()
  expect(end).not.toBeNull()
  expect(end!.y).toBeGreaterThan(start!.y + start!.height)
  expect(start!.width).toBeGreaterThan(250)
  expect(end!.width).toBeGreaterThan(250)
}

async function expectRecurrenceAligned(dialog: Locator) {
  const checkbox = dialog.getByLabel('Återkommande aktivitet')
  const row = checkbox.locator('..')
  const checkboxBox = await checkbox.boundingBox()
  const textBox = await row.locator('span').boundingBox()
  const rowBox = await row.boundingBox()
  expect(checkboxBox).not.toBeNull()
  expect(textBox).not.toBeNull()
  expect(rowBox).not.toBeNull()
  expect(
    Math.abs(checkboxBox!.y + checkboxBox!.height / 2 - (textBox!.y + textBox!.height / 2))
  ).toBeLessThanOrEqual(2)
  expect(rowBox!.height).toBeGreaterThanOrEqual(48)
}

test('skapar, öppnar och redigerar aktivitet med duration och flera reminders', async ({
  page
}) => {
  await login(page, {
    calendarCategories: [
      {
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        household_id: '24000000-0000-4000-8000-000000000024',
        name: 'Familj',
        icon: null,
        color: '#7c3aed',
        is_archived: false
      }
    ]
  })
  await page.getByRole('button', { name: 'Öppna meny' }).click()
  await page.getByRole('link', { name: 'Kalender' }).click()
  await page.getByRole('button', { name: /Ny aktivitet/ }).click()
  const createDialog = page.getByRole('dialog', { name: 'Ny aktivitet' })
  await expectRecurrenceAligned(createDialog)
  const createRecurrence = createDialog.getByLabel('Återkommande aktivitet')
  await createRecurrence.check()
  await expect(createDialog.locator('.recurrence-toggle')).toHaveClass(/active/)
  await expect(createDialog.getByLabel('Frekvens')).toBeVisible()
  await createRecurrence.uncheck()
  await expect(createDialog.getByLabel('Frekvens')).toHaveCount(0)

  await createDialog.getByLabel('Heldagsaktivitet').check()
  await expectAllDayDatesStacked(createDialog)
  await createDialog.getByLabel('Heldagsaktivitet').uncheck()
  await expect(createDialog.getByLabel('Starttid *')).toBeVisible()
  await expect(createDialog.getByLabel('Varaktighet *')).toBeVisible()

  await createDialog.getByLabel('Titel *').fill('Sprint 4D aktivitet')
  await createDialog.getByLabel('Startdatum *').fill('2026-08-10')
  await createDialog.getByLabel('Starttid *').fill('09:00')

  await createDialog.getByLabel('Varaktighet *').click()
  const durationSheet = page.getByRole('dialog', { name: 'Varaktighet' })
  await durationSheet.getByRole('button', { name: '1 timme 30 minuter' }).click()

  await createDialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  const participantSheet = page.getByRole('dialog', { name: 'Deltagare' })
  await expect(participantSheet.getByLabel('Patrik')).toBeChecked()
  await participantSheet.getByRole('button', { name: 'Klar' }).click()
  await createDialog.getByText('Plats').locator('..').getByRole('textbox').fill('Hemma')
  await createDialog.getByLabel('Kategori').selectOption({ label: 'Familj' })

  await createDialog.getByRole('button', { name: 'Ingen påminnelse' }).click()
  const reminderSheet = page.getByRole('dialog', { name: 'Påminnelser' })
  await reminderSheet.getByLabel('5 minuter före', { exact: true }).check()
  await reminderSheet.getByLabel('1 timme före', { exact: true }).check()
  await reminderSheet.getByRole('button', { name: 'Klar' }).click()
  await createDialog.getByLabel('Anteckning').fill('Mobiltest')
  await createDialog.getByRole('button', { name: 'Skapa aktivitet' }).click()
  await expect(createDialog).toHaveCount(0)

  await page.getByRole('button', { name: /Sprint 4D aktivitet/ }).click()
  const details = page.getByRole('dialog', { name: 'Sprint 4D aktivitet' })
  await expect(details.getByText(/09:00–10:30/)).toBeVisible()
  await expect(details.getByText('Hemma')).toBeVisible()
  await expect(details.getByText('Familj')).toBeVisible()
  await expect(details.getByText('Mobiltest')).toBeVisible()
  await details.getByRole('button', { name: 'Redigera' }).click()

  const editDialog = page.getByRole('dialog', { name: 'Redigera aktivitet' })
  await expect(editDialog.getByLabel('Titel *')).toHaveValue('Sprint 4D aktivitet')
  await expect(editDialog.getByLabel('Startdatum *')).toHaveValue('2026-08-10')
  await expect(editDialog.getByLabel('Starttid *')).toHaveValue('09:00')
  await expect(editDialog.getByLabel('Varaktighet *')).toContainText('1 timme 30 minuter')
  await expect(editDialog.getByRole('button', { name: 'Patrik' })).toBeVisible()
  await expect(editDialog.getByRole('button', { name: '5 min + 1 tim' })).toBeVisible()
  await expect(editDialog.getByLabel('Kategori')).toHaveValue(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  )
  await expect(editDialog.getByLabel('Anteckning')).toHaveValue('Mobiltest')

  await expectRecurrenceAligned(editDialog)
  const editRecurrence = editDialog.getByLabel('Återkommande aktivitet')
  await editRecurrence.check()
  await expect(editDialog.locator('.recurrence-toggle')).toHaveClass(/active/)
  await editRecurrence.uncheck()
  await expect(editDialog.locator('.recurrence-toggle')).not.toHaveClass(/active/)

  await editDialog.getByLabel('Heldagsaktivitet').check()
  await expectAllDayDatesStacked(editDialog)
  await editDialog.getByLabel('Heldagsaktivitet').uncheck()
  await expect(editDialog.getByLabel('Starttid *')).toHaveValue('09:00')

  await editDialog.getByLabel('Varaktighet *').click()
  await page
    .getByRole('dialog', { name: 'Varaktighet' })
    .getByRole('button', { name: '2 timmar' })
    .click()
  await editDialog.getByRole('button', { name: 'Spara' }).click()
  await expect(editDialog).toHaveCount(0)

  await page.getByRole('button', { name: /Sprint 4D aktivitet/ }).click()
  await expect(
    page.getByRole('dialog', { name: 'Sprint 4D aktivitet' }).getByText(/09:00–11:00/)
  ).toBeVisible()
})
