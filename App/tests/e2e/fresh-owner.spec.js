import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('fresh owner can register, restore a session, reauthenticate, and create a product', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The full owner journey runs once; responsive coverage is separate.')
  const stamp = `${Date.now()}-${testInfo.workerIndex}`
  const email = `owner-journey-${stamp}@example.local`
  const password = 'GreenMartTest123!'
  const productName = `Journey Product ${stamp}`

  await page.goto('/#/')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.getByRole('tab', { name: 'Register' }).click()
  await page.getByRole('textbox', { name: 'Username / owner name' }).fill('Journey Owner')
  await page.getByRole('textbox', { name: 'Shop name' }).fill(`Journey Shop ${stamp}`)
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Create shop' }).click()

  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Log out' }).click()
  await page.getByRole('button', { name: 'Create account' }).click()

  await page.getByRole('tab', { name: 'Register' }).click()
  await page.getByRole('textbox', { name: 'Username / owner name' }).fill('Invalid Owner')
  await page.getByRole('textbox', { name: 'Shop name' }).fill('Invalid Shop')
  await page.getByRole('textbox', { name: 'Email' }).fill(`invalid-${email}`)
  await page.getByRole('textbox', { name: 'Password' }).fill('short')
  await page.getByRole('button', { name: 'Create shop' }).click()
  await expect(page.getByRole('alert')).toContainText('Password must be at least 8 characters')
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Create shop' }).click()
  await expect(page.getByRole('alert')).toContainText('Email is already registered')
  await page.getByRole('tab', { name: 'Login' }).click()
  await page.getByRole('textbox', { name: 'Email' }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill('WrongPassword123!')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible({ timeout: 20_000 })

  await page.getByRole('button', { name: 'Products', exact: true }).click()
  await page.getByRole('button', { name: 'Add product' }).click()
  await page.getByRole('textbox', { name: 'Product name' }).fill(productName)
  await page.getByRole('textbox', { name: 'SKU' }).fill(`JOURNEY-${stamp}`)
  await page.getByRole('spinbutton', { name: 'Selling price' }).fill('5000')
  await page.getByRole('spinbutton', { name: 'Cost' }).fill('3000')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('combobox', { name: 'Base unit' }).click()
  await page.getByRole('option', { name: 'Piece (pc)' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('spinbutton', { name: 'Opening quantity' }).fill('5')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Save product' }).click()

  await expect(page.getByText(productName, { exact: true })).toBeVisible({ timeout: 20_000 })
  await page.reload()
  await expect(page.getByText(productName, { exact: true })).toBeVisible({ timeout: 20_000 })

  for (const route of ['home', 'order', 'stock', 'purchases', 'products', 'finance', 'balance', 'settings']) {
    await page.goto(`/#/${route}`)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('.page-skeleton')).toBeHidden()
    const results = await new AxeBuilder({ page }).analyze()
    const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))
    expect(blocking.flatMap((violation) => violation.nodes.map((node) =>
      `${route} · ${violation.id}: ${violation.help} (${node.target.join(', ')}) · ${node.html}`,
    ))).toEqual([])
  }
})
