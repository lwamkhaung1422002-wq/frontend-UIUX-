import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

expect.configure({ timeout: 15000 })

const widths = [360, 390, 768, 820, 1024, 1280, 1440]
const routes = ['home', 'order', 'purchases', 'products', 'settings']

for (const width of widths) {
  test(`core workspaces remain usable without overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await page.goto(`/#/${route}`)
      await expect(page.locator('main')).toBeVisible()
      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(dimensions.scrollWidth, `${route} overflowed at ${width}px`).toBeLessThanOrEqual(dimensions.clientWidth)
    }
    if (width < 1024) {
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Open global search' })).toBeVisible()
    } else {
      await expect(page.getByText('Store management')).toBeVisible()
    }
  })
}

test('login and critical workspaces have no serious accessibility violations', async ({ page }) => {
  await page.goto('/#/')
  const getStarted = page.getByRole('button', { name: 'Get Started' }).first()
  if (await getStarted.isVisible()) {
    await getStarted.click()
  } else {
    await page.getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Get Started' }).click()
  }
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  for (const route of ['/', '/home', '/order', '/purchases', '/products', '/settings']) {
    await page.goto(`/#${route}`)
    const results = await new AxeBuilder({ page }).analyze()
    const serious = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
    expect(serious.flatMap((violation) => violation.nodes.map((node) =>
      `${violation.id}: ${violation.help} (${node.target.join(', ')})`,
    ))).toEqual([])
  }
})
