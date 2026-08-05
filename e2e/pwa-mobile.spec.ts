import { expect, test } from '@playwright/test'

test('mobil installation, offline-banner och safe areas', async ({ page }, testInfo) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Välkommen hem' })).toBeVisible()

  const safeAreaPadding = await page.locator('body').evaluate(() => ({
    top: getComputedStyle(document.documentElement).getPropertyValue('--safe-top').trim(),
    bottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom').trim()
  }))
  expect(safeAreaPadding.top).toBe('0px')
  expect(safeAreaPadding.bottom).toBe('0px')
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    /viewport-fit=cover/
  )

  if (testInfo.project.name.startsWith('iphone-')) {
    await page.getByRole('button', { name: 'Installera på iPhone eller iPad' }).click()
    await expect(page.getByRole('dialog', { name: 'Installera Storhogsgatan 24' })).toBeVisible()
    await expect(page.getByText('Öppna sidan i Safari.')).toBeVisible()
    await expect(page.getByText('Välj Lägg till på hemskärmen.')).toBeVisible()
  } else {
    await page.evaluate(() => {
      const promptEvent = new Event('beforeinstallprompt')
      Object.assign(promptEvent, {
        prompt: () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' })
      })
      window.dispatchEvent(promptEvent)
    })
    const installButton = page.getByRole('button', { name: 'Installera appen' })
    await expect(installButton).toBeVisible()
    await installButton.click()
    await expect(installButton).toBeHidden()
  }

  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.getByText('Du är offline. Visade uppgifter kan vara inaktuella.')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText('Du är offline. Visade uppgifter kan vara inaktuella.')).toBeHidden()
})
