import { test, expect } from '@playwright/test'
import { login } from './calendar-fixture'

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

test('horisontellt svep byter månad men vertikal rörelse gör det inte', async ({ page }) => {
  await login(page)
  await page.getByRole('main').getByRole('link', { name: 'Kalender' }).click()
  const heading = page.locator('.calendar-toolbar h1')
  const initial = await heading.textContent()
  const surface = page.locator('.calendar-swipe-surface')
  await surface.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 320, clientY: 300 })
  await surface.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 80, clientY: 305 })
  await expect(heading).not.toHaveText(initial ?? '')
  const afterSwipe = await heading.textContent()
  await surface.dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 200, clientY: 200 })
  await surface.dispatchEvent('pointerup', { pointerType: 'touch', clientX: 205, clientY: 500 })
  await expect(heading).toHaveText(afterSwipe ?? '')
})
