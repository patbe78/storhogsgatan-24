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
  await expect(card(page, /^Våra arbetstider/)).toBeVisible()
  await expect(
    card(page, /^Familjens arbetstider/)
      .getByText('Felix', { exact: true })
      .first()
  ).toBeVisible()
  await expect(card(page, /^Hushållsuppgifter/)).toBeVisible()
  await expect(card(page, /^Mina kommande aktiviteter$/).getByText('Karlstad')).toBeVisible()
  await expect(card(page, /^Mina kommande aktiviteter$/).getByText('Heldag')).toHaveCount(0)
  await expect(page.getByText('Vecka 33')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjens arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter · V33' })).toBeVisible()
  await expect(card(page, /^Våra arbetstider/).getByText('21:30–05:30')).toBeVisible()
  await expect(card(page, /^Familjens arbetstider/).getByText('17:30–05:30')).toBeVisible()
  await expect(card(page, /^Familjens arbetstider/).getByText('Sjukskriven')).toBeVisible()
  await expect(card(page, /^Familjens arbetstider/).getByText('Heldag')).toHaveCount(0)
  await expect(
    card(page, /^Familjens arbetstider/).getByRole('heading', { name: 'Mån–Fre' })
  ).toBeVisible()
  await expect(card(page, /^Våra arbetstider/).getByText('Fre–Lör')).toHaveCount(0)
  await expect(card(page, /^Hushållsuppgifter/).getByText('06:00–17:00')).toHaveCount(0)

  for (const name of ['Våra arbetstider', 'Familjens arbetstider', 'Hushållsuppgifter']) {
    const header = card(page, new RegExp(`^${name}`)).locator('.dashboard-widget__header')
    const metrics = await header.evaluate((element) => {
      const heading = element.querySelector('h2')!
      const style = getComputedStyle(heading)
      const lineHeight =
        Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2
      const buttons = Array.from(element.querySelectorAll<HTMLElement>('button'))
      const visuals = Array.from(
        element.querySelectorAll<HTMLElement>('.dashboard-week-control__visual')
      )
      return {
        oneLine: heading.getBoundingClientRect().height <= lineHeight + 2,
        buttonSizes: buttons.map((button) => ({
          width: button.getBoundingClientRect().width,
          height: button.getBoundingClientRect().height
        })),
        visualSizes: visuals.map((visual) => visual.getBoundingClientRect().width)
      }
    })
    expect(metrics.oneLine).toBe(true)
    expect(metrics.buttonSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true)
    expect(metrics.visualSizes.every((width) => width >= 32 && width <= 36)).toBe(true)
  }

  const compactFamily = card(page, /^Familjens arbetstider/)
  const compactMetrics = await compactFamily.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    clippedRows: Array.from(
      element.querySelectorAll<HTMLElement>('.dashboard-week-activities a')
    ).filter((row) => row.scrollWidth > row.clientWidth).length
  }))
  expect(compactMetrics.height).toBeLessThan(660)
  expect(compactMetrics.scrollWidth).toBeLessThanOrEqual(compactMetrics.clientWidth)
  expect(compactMetrics.clippedRows).toBe(0)

  await compactFamily
    .getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' })
    .click()
  await expect(compactFamily.getByRole('heading', { level: 2 })).toHaveText(
    'Familjens arbetstider · V34'
  )
  await expect(compactFamily.getByText('Felix riktigt V34-pass · 08:00–16:00')).toBeVisible()
  await expect(compactFamily.getByText('17:30–05:30')).toHaveCount(0)
  await compactFamily
    .getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' })
    .click()
  await expect(compactFamily.getByText('17:30–05:30')).toBeVisible()
  await compactFamily
    .getByRole('button', { name: 'Visa nästa vecka för Familjens arbetstider' })
    .click()
  await expect(compactFamily.getByText('Felix riktigt V34-pass · 08:00–16:00')).toBeVisible()
  await expect(compactFamily.getByText('17:30–05:30')).toHaveCount(0)
  await compactFamily
    .getByRole('button', { name: 'Visa aktuell vecka för Familjens arbetstider' })
    .click()

  await card(page, /^Våra arbetstider/)
    .getByRole('button', { name: 'Visa nästa vecka för Våra arbetstider' })
    .click()
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V34' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjens arbetstider · V33' })).toBeVisible()
  await expect(
    card(page, /^Våra arbetstider/).getByRole('button', {
      name: 'Visa nästa vecka för Våra arbetstider'
    })
  ).toBeDisabled()
  await card(page, /^Våra arbetstider/)
    .getByRole('button', { name: 'Visa aktuell vecka för Våra arbetstider' })
    .click()
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()

  await card(page, /^Hushållsuppgifter/)
    .getByRole('button', { name: 'Visa nästa vecka för Hushållsuppgifter' })
    .click()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter · V34' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: 'Våra arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjens arbetstider · V33' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hushållsuppgifter · V33' })).toBeVisible()
})
