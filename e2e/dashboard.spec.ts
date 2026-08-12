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
  await expect(upcoming.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(upcoming.getByText('Städa köket')).toHaveCount(0)

  const myWork = card(page, /^Mina arbetstider/)
  await expect(myWork.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(myWork.getByText('07:00–08:00')).toBeVisible()

  const family = card(page, /^Familjens arbetstider/)
  await expect(family.locator('.dashboard-week-group h3')).toHaveText([
    'Mån–Fre',
    'Mån',
    'Tis',
    'Ons',
    'Tor',
    'Fre'
  ])
  await expect(family.getByText('Felix', { exact: true })).toHaveCount(5)
  await expect(family.getByText('Gustav', { exact: true })).toHaveCount(5)
  await expect(family.getByText('Alex', { exact: true })).toHaveCount(1)
  await expect(family.getByText('Sjukskriven · Heldag')).toBeVisible()
  await expect(family.getByText('Jobb', { exact: true })).toHaveCount(0)
  await expect(family.locator('.dashboard-week-owner__color')).toHaveCount(11)
  await expect(family.locator('.dashboard-owner')).toHaveCount(0)
  await expect(family.locator('.dashboard-events')).toHaveCount(0)
  await expect(family.getByText('Annas jobb')).toHaveCount(0)

  const household = card(page, /^Hushållsuppgifter/)
  await expect(household.getByText('Städa köket')).toBeVisible()
  await expect(household.getByText('Aktivitet två')).toHaveCount(0)
  await expect(page.getByText('Denna vecka')).toHaveCount(0)
  await expect(page.getByText('Nästa vecka')).toHaveCount(0)
  await expect(page.getByText(/Måndag 10 Aug/i)).toHaveCount(0)

  for (const name of ['Mina arbetstider', 'Familjens arbetstider', 'Hushållsuppgifter']) {
    await expect(
      page.getByRole('button', { name: `Visa aktuell vecka för ${name}` })
    ).toBeDisabled()
    await expect(page.getByRole('button', { name: `Visa nästa vecka för ${name}` })).toBeEnabled()
  }
})

test('har separat veckostate per kort och återställer den vid återinträde och reload', async ({
  page
}) => {
  const myWork = card(page, /^Mina arbetstider/)
  const family = card(page, /^Familjens arbetstider/)
  const household = card(page, /^Hushållsuppgifter/)

  await myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()
  await expect(myWork.getByRole('heading', { level: 2 })).toHaveText('Mina arbetstider – Vecka 34')
  await expect(myWork.getByText('Nattjour · 21:00–22:00')).toBeVisible()
  await expect(
    myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' })
  ).toBeDisabled()
  await expect(
    myWork.getByRole('button', { name: 'Visa aktuell vecka för Mina arbetstider' })
  ).toBeEnabled()
  await expect(family.getByRole('heading', { level: 2 })).toHaveText(
    'Familjens arbetstider – Vecka 33'
  )
  await expect(household.getByRole('heading', { level: 2 })).toHaveText(
    'Hushållsuppgifter – Vecka 33'
  )

  await myWork.getByRole('button', { name: 'Visa aktuell vecka för Mina arbetstider' }).click()
  await expect(myWork.getByRole('heading', { level: 2 })).toHaveText('Mina arbetstider – Vecka 33')
  await myWork.getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' }).click()

  await family.getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' }).click()
  await expect(family.getByRole('heading', { level: 2 })).toHaveText(
    'Familjens arbetstider – Vecka 34'
  )
  await expect(family.getByText('Inga arbetstider denna vecka.')).toBeVisible()
  await expect(myWork.getByRole('heading', { level: 2 })).toHaveText('Mina arbetstider – Vecka 34')
  await expect(household.getByRole('heading', { level: 2 })).toHaveText(
    'Hushållsuppgifter – Vecka 33'
  )
  await family.getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' }).click()

  await household.getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading', { level: 2 })).toHaveText(
    'Hushållsuppgifter – Vecka 34'
  )
  await expect(household.getByText('Tvätta bilen')).toBeVisible()
  await expect(myWork.getByRole('heading', { level: 2 })).toHaveText('Mina arbetstider – Vecka 34')
  await expect(family.getByRole('heading', { level: 2 })).toHaveText(
    'Familjens arbetstider – Vecka 33'
  )

  await household.getByRole('button', { name: 'Visa aktuell vecka för Hushållsuppgifter' }).click()
  await expect(household.getByRole('heading', { level: 2 })).toHaveText(
    'Hushållsuppgifter – Vecka 33'
  )
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
