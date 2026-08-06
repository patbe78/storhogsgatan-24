import { expect, test } from '@playwright/test'
import { login } from './calendar-fixture'

test('admin ser familjemedlemmar under inställningar', async ({ page }) => {
  await login(page)
  await page.goto('/installningar')
  await expect(page.getByRole('heading', { name: 'Familjemedlemmar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bjud in familjemedlem' })).toBeVisible()
})

test('member saknar familjeadministrationen', async ({ page }) => {
  await login(page, { role: 'member' })
  await page.goto('/installningar')
  await expect(page.getByRole('heading', { name: 'Inställningar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Familjemedlemmar' })).toHaveCount(0)
})

test('publik accept-route tar bort token ur adressfältet och visar neutralt fel', async ({
  page
}) => {
  await page.goto('/acceptera-inbjudan?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
  await expect(page.getByRole('heading', { name: 'Inbjudan' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText(
    'Inbjudan är inte giltig eller kan inte längre användas.'
  )
  await expect(page).toHaveURL(/\/acceptera-inbjudan$/)
})
