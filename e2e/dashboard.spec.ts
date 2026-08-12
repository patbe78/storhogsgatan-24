import { expect, test, type Page } from '@playwright/test'
import { login } from './calendar-fixture'
import { dashboardFixtureOptions } from './dashboard-fixture'

const fixedNow = new Date('2026-08-11T10:00:00.000Z')

function card(page: Page, name: RegExp) {
  return page.getByRole('heading', { name }).locator('..')
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
  await expect(page.getByLabel('Datum och veckonummer')).toContainText('Vecka 33')
  const headings = page.locator('.dashboard-widget h2')
  await expect(headings).toHaveText([
    'Mina kommande aktiviteter',
    'Mina arbetstider – Vecka 33',
    'Familjens arbetstider – Vecka 33',
    'Hushållsuppgifter – Vecka 33'
  ])

  const upcoming = card(page, /^Mina kommande aktiviteter$/)
  await expect(upcoming.getByRole('link')).toHaveCount(6)
  await expect(upcoming.getByText('Filterdold aktivitet')).toBeVisible()
  await expect(upcoming.getByText('Mitt jobb')).toHaveCount(0)
  await expect(upcoming.getByText('Städa köket')).toHaveCount(0)

  const family = card(page, /^Familjens arbetstider/)
  await expect(family.getByText('Felix sommarjobb')).toBeVisible()
  await expect(family.getByText('Felix', { exact: true })).toBeVisible()
  await expect(family.getByText('Mitt jobb', { exact: true })).toHaveCount(0)
  await expect(family.getByText('Annas jobb')).toHaveCount(0)
})

test('har separat veckostate per kort och återställer den vid återinträde och reload', async ({
  page
}) => {
  const myWork = card(page, /^Mina arbetstider/)
  const family = card(page, /^Familjens arbetstider/)
  const household = card(page, /^Hushållsuppgifter/)

  await myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()
  await expect(myWork.getByRole('heading')).toHaveText('Mina arbetstider – Vecka 34')
  await expect(myWork.getByText('Mitt jobb nästa')).toBeVisible()
  await expect(family.getByRole('heading')).toHaveText('Familjens arbetstider – Vecka 33')
  await expect(household.getByRole('heading')).toHaveText('Hushållsuppgifter – Vecka 33')

  await myWork.getByRole('button', { name: 'Visa aktuell vecka för Mina arbetstider' }).click()
  await expect(myWork.getByRole('heading')).toHaveText('Mina arbetstider – Vecka 33')
  await myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()

  await family.getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' }).click()
  await expect(family.getByRole('heading')).toHaveText('Familjens arbetstider – Vecka 34')
  await expect(family.getByText('Inga arbetstider denna vecka.')).toBeVisible()
  await expect(myWork.getByRole('heading')).toHaveText('Mina arbetstider – Vecka 34')
  await expect(household.getByRole('heading')).toHaveText('Hushållsuppgifter – Vecka 33')
  await family.getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' }).click()

  await household.getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading')).toHaveText('Hushållsuppgifter – Vecka 34')
  await expect(household.getByText('Tvätta bilen')).toBeVisible()
  await expect(myWork.getByRole('heading')).toHaveText('Mina arbetstider – Vecka 34')
  await expect(family.getByRole('heading')).toHaveText('Familjens arbetstider – Vecka 33')

  await household.getByRole('button', { name: 'Visa aktuell vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading')).toHaveText('Hushållsuppgifter – Vecka 33')
  await household.getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' }).click()

  await page.getByRole('link', { name: 'Kalender' }).click()
  await expect(page).toHaveURL(/\/kalender/)
  await expect(page.getByRole('button', { name: 'Ny aktivitet' })).toBeVisible()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Mina arbetstider – Vecka 33' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Familjens arbetstider – Vecka 33' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter – Vecka 33' })).toBeVisible()

  await page.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Mina arbetstider – Vecka 33' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Familjens arbetstider – Vecka 33' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter – Vecka 33' })).toBeVisible()
})
