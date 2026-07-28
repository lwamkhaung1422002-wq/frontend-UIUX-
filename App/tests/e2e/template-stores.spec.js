/* global process */
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const stores = [
  ['General Store Demo', 'General Store'],
  ['Mini-market Demo', 'Mini-market'],
  ['Fashion Demo', 'Fashion'],
  ['Electronics Demo', 'Electronics'],
  ['Pharmacy Demo', 'Pharmacy'],
  ['Cosmetics Demo', 'Cosmetics'],
  ['Online Restaurant Demo', 'Online Restaurant'],
  ['Wholesale Demo', 'Wholesale'],
]

test('demo owner can reach every isolated template store through the real UI', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Template switching runs once; viewport coverage is separate.')
  test.skip(!process.env.E2E_DEMO_EMAIL || !process.env.E2E_DEMO_PASSWORD, 'Demo credentials are environment-controlled.')

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(process.env.E2E_DEMO_EMAIL)
  await page.getByRole('textbox', { name: 'Password' }).fill(process.env.E2E_DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({ timeout: 20_000 })
  const evidenceDirectory = join(process.cwd(), 'uat-evidence', 'screenshots')
  mkdirSync(evidenceDirectory, { recursive: true })

  for (const [storeName, templateLabel] of stores) {
    const switcher = page.getByRole('button', { name: /Switch store/ })
    if (!(await switcher.getAttribute('aria-label')).includes(storeName)) {
      await switcher.click()
      await page.getByRole('menuitem', { name: storeName }).click()
    }
    await expect(page.getByRole('button', { name: `Switch store. Current store: ${storeName}` }))
      .toBeVisible({ timeout: 20_000 })
    await page.goto('/#/settings')
    await expect(page.getByRole('heading', { name: 'App Settings' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Store template' })).toHaveText(templateLabel)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
    expect(serious, `${storeName} must have zero serious/critical accessibility violations`).toEqual([])
    await page.screenshot({
      path: join(evidenceDirectory, `${storeName.toLowerCase().replaceAll(' ', '-')}.png`),
      fullPage: true,
    })
  }
})
