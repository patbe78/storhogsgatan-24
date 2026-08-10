import { expect, test, type Page } from '@playwright/test'
import { login } from './calendar-fixture'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

async function openCreateDialog(page: Page, title: string) {
  await page.getByRole('button', { name: /Ny aktivitet/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Ny aktivitet' })
  await dialog.getByLabel('Titel *').fill(title)
  return dialog
}

async function expectPageUnlocked(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        htmlOverflow: document.documentElement.style.overflow,
        bodyLocked: document.body.classList.contains('calendar-scroll-locked'),
        htmlLocked: document.documentElement.classList.contains('calendar-scroll-locked')
      }))
    )
    .toEqual({
      bodyOverflow: '',
      bodyPosition: '',
      htmlOverflow: '',
      bodyLocked: false,
      htmlLocked: false
    })
}

async function expectPageUnlockedAndScrollable(page: Page) {
  await expectPageUnlocked(page)
  const maxScroll = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  )
  expect(maxScroll).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function expectOverlayLocked(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        bodyOverflow: document.body.style.overflow,
        bodyPosition: document.body.style.position,
        htmlOverflow: document.documentElement.style.overflow,
        locked: document.body.classList.contains('calendar-scroll-locked')
      }))
    )
    .toEqual({
      bodyOverflow: 'hidden',
      bodyPosition: 'fixed',
      htmlOverflow: 'hidden',
      locked: true
    })
}

test.beforeEach(async ({ page }) => {
  await login(page)
  await page.getByRole('main').getByRole('link', { name: 'Kalender' }).click()
})

test('A: deltagare och påminnelser kan stängas före create utan scroll-läckage', async ({
  page
}) => {
  const dialog = await openCreateDialog(page, 'Scrolltest A')
  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  await page
    .getByRole('dialog', { name: 'Deltagare' })
    .getByRole('button', { name: 'Klar' })
    .click()
  await dialog.getByRole('button', { name: 'Ingen påminnelse' }).click()
  await page
    .getByRole('dialog', { name: 'Påminnelser' })
    .getByRole('button', { name: 'Klar' })
    .click()
  await dialog.getByRole('button', { name: 'Skapa aktivitet' }).click()
  await expect(dialog).toHaveCount(0)
  await expectPageUnlockedAndScrollable(page)
})

test('B: varaktighet kan väljas före create utan scroll-läckage', async ({ page }) => {
  const dialog = await openCreateDialog(page, 'Scrolltest B')
  await dialog.getByLabel('Varaktighet *').click()
  await page
    .getByRole('dialog', { name: 'Varaktighet' })
    .getByRole('button', { name: '1 timme 30 minuter' })
    .click()
  await dialog.getByRole('button', { name: 'Skapa aktivitet' }).click()
  await expect(dialog).toHaveCount(0)
  await expectPageUnlockedAndScrollable(page)
})

test('C: upprepade sheet-cykler lämnar bara parent-låset och create låser upp allt', async ({
  page
}) => {
  const dialog = await openCreateDialog(page, 'Scrolltest C')
  for (let index = 0; index < 3; index += 1) {
    await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
    const participants = page.getByRole('dialog', { name: 'Deltagare' })
    if (index % 2 === 0) await participants.getByRole('button', { name: 'Stäng' }).click()
    else await participants.getByRole('button', { name: 'Klar' }).click()

    await dialog.getByRole('button', { name: 'Ingen påminnelse' }).click()
    const reminders = page.getByRole('dialog', { name: 'Påminnelser' })
    if (index % 2 === 0) await reminders.getByRole('button', { name: 'Klar' }).click()
    else await reminders.getByRole('button', { name: 'Stäng' }).click()
    await expectOverlayLocked(page)
  }

  await dialog.getByRole('button', { name: 'Skapa aktivitet' }).click()
  await expect(dialog).toHaveCount(0)
  await expectPageUnlockedAndScrollable(page)
})

test('D: Avbryt, X och navigation med öppet sheet återställer scroll', async ({ page }) => {
  let dialog = await openCreateDialog(page, 'Avbryt')
  await dialog.getByRole('button', { name: 'Avbryt' }).click()
  await expectPageUnlockedAndScrollable(page)

  dialog = await openCreateDialog(page, 'Stäng')
  await dialog.getByRole('button', { name: 'Stäng' }).click()
  await expectPageUnlockedAndScrollable(page)

  dialog = await openCreateDialog(page, 'Navigation')
  await dialog.getByRole('group', { name: 'Deltagare *' }).getByRole('button').click()
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Inställningar' })
    .evaluate((element) => (element as HTMLElement).click())
  await expect(page.getByRole('heading', { name: 'Inställningar' })).toBeVisible()
  await expectPageUnlocked(page)
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Kalender' })
    .evaluate((element) => (element as HTMLElement).click())
  await expectPageUnlockedAndScrollable(page)
})

test('E: create-fel följt av stängning lämnar sidan scrollbar', async ({ page }) => {
  await login(page, { calendarSaveFailures: 1 })
  await page.getByRole('main').getByRole('link', { name: 'Kalender' }).click()
  const dialog = await openCreateDialog(page, 'Feltest')
  await dialog.getByRole('button', { name: 'Skapa aktivitet' }).click()
  await expect(page.getByRole('alert')).toContainText('Något gick fel')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Stäng' }).click()
  await expectPageUnlockedAndScrollable(page)
})
