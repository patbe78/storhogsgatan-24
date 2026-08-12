import { expect, test, type Page } from '@playwright/test'
import { login } from './calendar-fixture'
import { dashboardFixtureOptions } from './dashboard-fixture'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

function card(page: Page, name: RegExp) {
  return page.getByRole('heading', { name }).locator('..').locator('..')
}

test('dashboard 2.0 fungerar på iPhone utan overflow eller scroll-lock', async ({ page }) => {
  await page.addInitScript(`
    const RealDate = Date;
    const fixed = ${new Date('2026-08-11T10:00:00.000Z').getTime()};
    globalThis.Date = class extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixed])); }
      static now() { return fixed; }
    };
  `)
  await login(page, dashboardFixtureOptions())

  await expect(page.getByLabel('Datum och veckonummer')).toBeVisible()
  await expect(card(page, /^Mina kommande aktiviteter$/).getByRole('link')).toHaveCount(6)
  await expect(card(page, /^Mina arbetstider/)).toBeVisible()
  await expect(
    card(page, /^Familjens arbetstider/)
      .getByText('Felix', { exact: true })
      .first()
  ).toBeVisible()
  await expect(card(page, /^Hushållsuppgifter/)).toBeVisible()

  const compactFamily = card(page, /^Familjens arbetstider/)
  const compactMetrics = await compactFamily.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clippedRows: Array.from(
      element.querySelectorAll<HTMLElement>('.dashboard-week-activities a')
    ).filter((row) => row.scrollWidth > row.clientWidth).length
  }))
  expect(compactMetrics.height).toBeLessThan(650)
  expect(compactMetrics.scrollWidth).toBeLessThanOrEqual(compactMetrics.clientWidth)
  expect(compactMetrics.clippedRows).toBe(0)

  await card(page, /^Mina arbetstider/)
    .getByRole('button', { name: 'Visa nästa vecka för Mina arbetstider' })
    .click()
  await expect(page.getByRole('heading', { name: 'Mina arbetstider – Vecka 34' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Familjens arbetstider – Vecka 33' })
  ).toBeVisible()

  await card(page, /^Hushållsuppgifter/)
    .getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' })
    .click()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter – Vecka 34' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mina arbetstider – Vecka 34' })).toBeVisible()

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyOverflow: document.body.style.overflow,
    htmlOverflow: document.documentElement.style.overflow,
    locked: document.body.classList.contains('calendar-scroll-locked')
  }))
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport)
  expect(layout.scrollHeight).toBeGreaterThan(844)
  expect(layout.bodyOverflow).toBe('')
  expect(layout.htmlOverflow).toBe('')
  expect(layout.locked).toBe(false)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Öppna meny' }).click()
  await page.getByRole('link', { name: 'Kalender' }).click()
  await expect(page).toHaveURL(/\/kalender/)
  await expect(page.getByRole('button', { name: 'Ny aktivitet' })).toBeVisible()
  await page.getByRole('button', { name: 'Öppna meny' }).click()
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByRole('heading', { name: 'Mina arbetstider – Vecka 33' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Familjens arbetstider – Vecka 33' })
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter – Vecka 33' })).toBeVisible()
})
