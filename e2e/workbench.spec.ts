import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { tools } from '../src/tools'

for (const tool of tools) {
  test(`worker sample: ${tool.name}`, async ({ page }) => {
    await page.goto(`/#${tool.id}`)
    await page.getByRole('button', { name: 'Load example', exact: true }).click()
    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.getByLabel('Output', { exact: true })).not.toHaveValue('', { timeout: 20000 })
    await expect(page.getByRole('alert')).toHaveCount(0)
  })
}
test('errors, keyboard execution, and downloadable output', async ({ page }) => {
  await page.goto('/#json-format'); await page.getByLabel('Input', { exact: true }).fill('{')
  await page.getByRole('button', { name: 'Run', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Input', { exact: true }).fill('{"ok":true}'); await page.getByLabel('Input', { exact: true }).press('Control+Enter')
  await expect(page.getByLabel('Output', { exact: true })).toHaveValue('{\n  "ok": true\n}')
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download output', exact: true }).click(); expect((await download).suggestedFilename()).toBe('json-format.txt')
})
test('search, favorites persistence, and private history', async ({ page }, testInfo) => {
  await page.goto('/'); if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.getByLabel('Search tools', { exact: true }).fill('contrast'); await expect(page.locator('.nav-item')).toHaveCount(1); await page.locator('.nav-item').click()
  await page.getByRole('button', { name: 'Add favorite', exact: true }).click(); await expect(page.getByRole('button', { name: 'Remove favorite', exact: true })).toBeEnabled(); await page.reload(); await expect(page.getByRole('button', { name: 'Remove favorite', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load example', exact: true }).click(); await page.getByRole('button', { name: 'Run', exact: true }).click(); await expect(page.getByLabel('Output', { exact: true })).not.toHaveValue('')
  await page.getByRole('button', { name: 'Open history', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('WCAG contrast checker'); await expect(page.getByRole('dialog')).not.toContainText('#155e75')
  await page.getByRole('button', { name: 'Clear history', exact: true }).click(); await expect(page.getByRole('dialog')).toContainText('No recent activity'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
})
test('accessible layout with no horizontal overflow or external requests', async ({ page }) => {
  const external: string[] = []; page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('data:')) external.push(request.url()) })
  await page.goto('/'); expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(external).toEqual([])
  await page.screenshot({ path: `test-results/developer-${await page.evaluate(() => window.innerWidth)}.png`, fullPage: true })
})