import { expect, test, type Page } from '@playwright/test'
import { login } from './calendar-fixture'
import { dashboardFixtureOptions } from './dashboard-fixture'

const fixedNow = new Date('2026-08-11T10:00:00.000Z')

function card(page: Page, name: RegExp) {
  return page.getByRole('heading', { name }).locator('..').locator('..')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(`
    const RealDate = Date;
    const fixed = ${fixedNow.getTime()};
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  `)
  await login(page, dashboardFixtureOptions())
})

test('visar den personliga dashboarden i rätt ordning och oberoende av kalenderfilter', async ({
  page
}) => {
  await expect(page.getByLabel('Datum och veckonummer')).toContainText('Tisdag 11 Augusti')
  await expect(page.getByLabel('Datum och veckonummer')).toContainText('V33')
  await expect(page.getByText('Vecka 33')).toHaveCount(0)
  const headings = page.locator('.dashboard-widget h2')
  await expect(headings).toHaveText([
    'Mina kommande aktiviteter',
    'Våra arbetstider · V33',
    'Familjens arbetstider · V33',
    'Hushållsuppgifter · V33'
  ])

  const upcoming = card(page, /^Mina kommande aktiviteter$/)
  await expect(upcoming.getByRole('link')).toHaveCount(6)
  await expect(upcoming.getByText('Filterdold aktivitet')).toBeVisible()
  await expect(upcoming.getByText('Karlstad')).toBeVisible()
  await expect(upcoming.getByText('Heldag')).toHaveCount(0)
  await expect(upcoming.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(upcoming.getByText('Sophämtning tunna 1')).toHaveCount(0)

  const ourWork = card(page, /^Våra arbetstider/)
  await expect(ourWork.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(ourWork.getByText('Patrik', { exact: true })).toBeVisible()
  await expect(ourWork.getByText('Åsa', { exact: true })).toHaveCount(2)
  await expect(ourWork.getByText('07:00–08:00')).toBeVisible()
  await expect(ourWork.getByText('09:00–10:00')).toBeVisible()
  await expect(ourWork.getByText('21:30–05:30')).toBeVisible()
  await expect(ourWork.locator('.dashboard-week-group h3')).toHaveText(['Ons', 'Tor', 'Fre'])
  await expect(ourWork.getByText('Fre–Lör')).toHaveCount(0)
  await expect(ourWork.locator('.dashboard-week-owner__color')).toHaveCount(3)

  const family = card(page, /^Familjens arbetstider/)
  await expect(family.locator('.dashboard-week-group h3')).toHaveText([
    'Mån–Fre',
    'Mån',
    'Tis',
    'Ons',
    'Tor',
    'Fre',
    'Sön'
  ])
  await expect(family.getByText('Felix', { exact: true })).toHaveCount(6)
  await expect(family.getByText('Gustav', { exact: true })).toHaveCount(5)
  await expect(family.getByText('Alex', { exact: true })).toHaveCount(1)
  await expect(family.getByText('Sjukskriven', { exact: true })).toBeVisible()
  await expect(family.getByText('Heldag')).toHaveCount(0)
  await expect(family.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(family.getByText('17:30–05:30')).toBeVisible()
  await expect(family.locator('.dashboard-week-owner__color')).toHaveCount(12)
  await expect(family.locator('.dashboard-owner')).toHaveCount(0)
  await expect(family.locator('.dashboard-events')).toHaveCount(0)
  await expect(family.getByText('Åsa', { exact: true })).toHaveCount(0)

  const household = card(page, /^Hushållsuppgifter/)
  await expect(household.getByText('Sophämtning tunna 1')).toBeVisible()
  await expect(household.getByText('06:00–17:00')).toHaveCount(0)
  await expect(household.getByText('Karlstad')).toHaveCount(0)
  await expect(page.getByText('Denna vecka')).toHaveCount(0)
  await expect(page.getByText('Nästa vecka')).toHaveCount(0)
  await expect(page.getByText(/Måndag 10 Aug/i)).toHaveCount(0)

  for (const name of ['Våra arbetstider', 'Familjens arbetstider', 'Hushållsuppgifter']) {
    await expect(
      page.getByRole('button', { name: `Visa aktuell vecka för ${name}` })
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: `Visa nästa vecka för ${name}` })).toBeEnabled()
  }
})

test('har separat veckostate per kort och återställer den vid återinträde och reload', async ({
  page
}) => {
  const ourWork = card(page, /^Våra arbetstider/)
  const family = card(page, /^Familjens arbetstider/)
  const household = card(page, /^Hushållsuppgifter/)

  await expect(family.getByText('17:30–05:30')).toBeVisible()

  await ourWork.getByRole('button', { name: 'Visa nästa vecka för Våra arbetstider' }).click()
  await expect(ourWork.getByRole('heading', { level: 2 })).toHaveText('Våra arbetstider · V34')
  await expect(ourWork.getByText('Nattjour · 21:00–22:00')).toBeVisible()
  await expect(
    ourWork.getByRole('button', { name: 'Visa nästa vecka för Våra arbetstider' })
  ).toBeDisabled()
  await expect(
    ourWork.getByRole('button', { name: 'Visa aktuell vecka för Våra arbetstider' })
  ).toBeEnabled()
  await expect(family.getByRole('heading', { level: 2 })).toHaveText('Familjens arbetstider · V33')
  await expect(household.getByRole('heading', { level: 2 })).toHaveText('Hushållsuppgifter · V33')

  await ourWork.getByRole('button', { name: 'Visa aktuell vecka för Våra arbetstider' }).click()
  await expect(ourWork.getByRole('heading', { level: 2 })).toHaveText('Våra arbetstider · V33')
  await ourWork.getByRole('button', { name: 'Visa nästa vecka för Våra arbetstider' }).click()

  await family.getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' }).click()
  await expect(family.getByRole('heading', { level: 2 })).toHaveText('Familjens arbetstider · V34')
  await expect(family.getByText('Felix riktigt V34-pass · 08:00–16:00')).toBeVisible()
  await expect(family.getByText('17:30–05:30')).toHaveCount(0)
  await expect(ourWork.getByRole('heading', { level: 2 })).toHaveText('Våra arbetstider · V34')
  await expect(household.getByRole('heading', { level: 2 })).toHaveText('Hushållsuppgifter · V33')
  await family.getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' }).click()
  await expect(family.getByText('17:30–05:30')).toBeVisible()
  await family.getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' }).click()
  await expect(family.getByText('Felix riktigt V34-pass · 08:00–16:00')).toBeVisible()
  await expect(family.getByText('17:30–05:30')).toHaveCount(0)
  await family.getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' }).click()

  await household.getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading', { level: 2 })).toHaveText('Hushållsuppgifter · V34')
  await expect(household.getByText('Tvätta bilen')).toBeVisible()
  await expect(ourWork.getByRole('heading', { level: 2 })).toHaveText('Våra arbetstider · V34')
  await expect(family.getByRole('heading', { level: 2 })).toHaveText('Familjens arbetstider · V33')

  await household.getByRole('button', { name: 'Visa aktuell vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading', { level: 2 })).toHaveText('Hushållsuppgifter · V33')
  await household.getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' }).click()

  await page.getByRole('link', { name: 'Kalender' }).click()
  await expect(page).toHaveURL(/\/kalender/)
  await expect(page.getByRole('button', { name: 'Ny aktivitet' })).toBeVisible()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjens arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter · V33' })).toBeVisible()

  await page.getByRole('button', { name: 'Visa nästa vecka för Våra arbetstider' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjens arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter · V33' })).toBeVisible()
})
