import { test, expect } from '@playwright/test'
test('visar inloggningssidan utan Supabase-konfiguration', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Välkommen hem' })).toBeVisible()
})
