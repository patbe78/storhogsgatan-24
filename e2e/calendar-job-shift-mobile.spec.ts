import { expect, test } from '@playwright/test'
import { householdId, login, userId } from './calendar-fixture'

test('jobbpass är touchvänligt, kompakt och blockerar inte mobilfiltret', async ({ page }) => {
  await login(page, {
    calendarProfiles: [
      { id: userId, name: 'Patrik', color: '#2563eb' },
      { id: '22222222-2222-4222-8222-222222222222', name: 'Felix', color: '#16a34a' }
    ],
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
  const startDate = dialog.getByLabel('Startdatum *')
  await expect(dialog.getByRole('button', { name: 'Stäng' })).toBeFocused()
  await expect(startDate).not.toBeFocused()
  await startDate.click()
  await expect(startDate).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Spara', exact: true })).toBeInViewport()
  await expect(dialog.getByRole('button', { name: 'Avsluta inmatning' })).toBeInViewport()
  await expect
    .poll(() => dialog.evaluate((element) => element.scrollWidth <= element.clientWidth))
    .toBe(true)
  const startTime = await dialog.getByLabel('Starttid *').boundingBox()
  const endTime = await dialog.getByLabel('Sluttid *').boundingBox()
  expect(startTime).not.toBeNull()
  expect(endTime).not.toBeNull()
  expect(startTime!.x + startTime!.width).toBeLessThanOrEqual(endTime!.x)

  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  const participantSheet = page.getByRole('dialog', { name: 'Deltagare' })
  await participantSheet.getByLabel('Felix').check()
  await expect(participantSheet.getByLabel('Patrik')).not.toBeChecked()
  await expect(participantSheet.getByLabel('Felix')).toBeChecked()
  await participantSheet.getByRole('button', { name: 'Klar' }).click()
  await expect(dialog.getByRole('group', { name: 'Deltagare *' })).toContainText('Felix')

  await dialog.getByRole('button', { name: /Återkommande Ingen återkommande/ }).click()
  const recurrenceSheet = page.getByRole('dialog', { name: 'Återkommande' })
  await recurrenceSheet.getByLabel('Varje vecka', { exact: true }).click()
  await expect(dialog.getByText('Till och med vecka')).toBeVisible()
  await dialog.getByRole('button', { name: /Till och med vecka/ }).click()
  const weekSheet = page.getByRole('dialog', { name: 'Till och med vecka' })
  await expect(weekSheet.getByRole('radio').first()).toBeVisible()
  await weekSheet.getByRole('radio').nth(1).click()
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

test('native tidsfält ryms i två kolumner även vid 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await login(page, {
    calendarProfiles: [{ id: userId, name: 'Patrik', color: '#2563eb' }],
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
  await page.getByRole('button', { name: /Jobbpass/ }).click()

  const dialog = page.getByRole('dialog', { name: 'Lägg till jobbpass' })
  const startTime = dialog.getByLabel('Starttid *')
  const endTime = dialog.getByLabel('Sluttid *')
  const startWrapper = startTime.locator('xpath=..')
  const endWrapper = endTime.locator('xpath=..')
  const startField = startWrapper.locator('xpath=..')
  const endField = endWrapper.locator('xpath=..')

  const layout = await Promise.all(
    [startField, endField, startWrapper, endWrapper].map((locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return { left: rect.left, right: rect.right, width: rect.width }
      })
    )
  )
  const [startFieldBox, endFieldBox, startWrapperBox, endWrapperBox] = layout
  expect(startFieldBox.right).toBeLessThanOrEqual(endFieldBox.left)
  expect(startWrapperBox.left).toBeGreaterThanOrEqual(startFieldBox.left)
  expect(startWrapperBox.right).toBeLessThanOrEqual(startFieldBox.right)
  expect(endWrapperBox.left).toBeGreaterThanOrEqual(endFieldBox.left)
  expect(endWrapperBox.right).toBeLessThanOrEqual(endFieldBox.right)
  expect(startWrapperBox.width).toBeGreaterThan(0)
  expect(endWrapperBox.width).toBeGreaterThan(0)

  for (const input of [startTime, endTime]) {
    const sizing = await input.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      const parentRect = element.parentElement!.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        left: rect.left,
        right: rect.right,
        parentLeft: parentRect.left,
        parentRight: parentRect.right,
        paddingLeft: style.paddingLeft,
        paddingRight: style.paddingRight
      }
    })
    expect(sizing.left).toBeGreaterThanOrEqual(sizing.parentLeft)
    expect(sizing.right).toBeLessThanOrEqual(sizing.parentRight)
    expect(sizing.paddingLeft).toBe('0px')
    expect(sizing.paddingRight).toBe('0px')
  }
})
