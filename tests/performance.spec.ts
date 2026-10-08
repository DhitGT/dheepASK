import { test, expect } from '@playwright/test'

test('Instagram touch reactions use static assets, keep stable bounds and stop repeating on scroll', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 }, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0',
  })
  try {
    const page = await context.newPage()
    const animatedRequests: string[] = []
    page.on('request', request => { if (/\/emoji\/noto\/.*\.webp/.test(request.url())) animatedRequests.push(request.url()) })
    await page.goto('/')
    await expect(page.locator('.app-layout')).toHaveClass(/light-effects/)
    await expect(page.locator('.galaxy-star')).toHaveCount(64)
    const panel = page.getByRole('region', { name: 'Reaksi untuk DheepASK' })
    expect(await panel.evaluate(el => getComputedStyle(el).backdropFilter)).toBe('none')
    const button = panel.getByRole('button').first()
    const count = page.getByTestId('reaction-count-heart')
    await expect(button).toBeEnabled()
    const before = (await button.boundingBox())!
    await button.tap()
    await expect(count).toHaveText('1')
    expect((await button.boundingBox())!.y).toBe(before.y)
    await expect.poll(() => panel.locator('img[data-reaction="heart"]').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0 && el.currentSrc.endsWith('.png'))).toBe(true)
    await button.dispatchEvent('pointerdown', { pointerId: 42, pointerType: 'touch', isPrimary: true, button: 0 })
    await expect.poll(async () => Number(await count.innerText())).toBeGreaterThan(3)
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')))
    await expect(button).not.toHaveClass(/is-holding/)
    const released = await count.innerText()
    await page.waitForTimeout(300)
    await expect(count).toHaveText(released)
    expect(animatedRequests).toEqual([])
    expect(await page.locator('.galaxy-meteor').first().evaluate(el => getComputedStyle(el).animationName)).toMatch(/^galaxy-meteor/)
    expect(await page.locator('.aurora-violet').evaluate(el => getComputedStyle(el).filter)).toBe('none')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/instagram-reactions.png' })
  } finally { await context.close() }
})

test('rapid reactions retain every count with bounded visual work and survive navigation', async ({ page }) => {
  await page.goto('/')
  const heart = page.locator('.hero-reactions button.reaction-button').first()
  await expect(heart).toBeEnabled()
  await heart.evaluate((button: HTMLButtonElement) => { for (let index = 0; index < 75; index++) button.click() })
  await expect(page.getByTestId('reaction-count-heart')).toHaveText('75')
  expect(await page.locator('.reaction-burst').count()).toBeLessThanOrEqual(8)
  await page.locator('.question-card').first().getByRole('link', { name: 'Buka pertanyaan' }).click()
  await page.getByRole('link', { name: 'Kembali menjelajah' }).click()
  await expect(page.getByTestId('reaction-count-heart')).toHaveText('75')
})

test('large feeds render in batches and reset the visible limit when filtering', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('dheepask-demo-v1')) return
    const questions = Array.from({ length: 60 }, (_, index) => ({
      id: `performance-${index}`, short_code: '', title: `Pertanyaan performa ${index}`,
      body: 'Konteks pertanyaan', category: index % 2 ? 'Random' : 'Karier',
      created_at: new Date(Date.now() - index * 1000).toISOString(), answer_count: 0,
    }))
    localStorage.setItem('dheepask-demo-v1', JSON.stringify({ questions, answers: [] }))
  })
  await page.goto('/')
  const cards = page.locator('.feed-section .question-card')
  await expect(cards).toHaveCount(24)
  await page.getByRole('button', { name: 'Lihat lebih banyak pertanyaan' }).click()
  await expect(cards).toHaveCount(48)
  await page.getByRole('button', { name: 'Karier', exact: true }).click()
  await expect(cards).toHaveCount(24)
  await page.getByRole('button', { name: 'Lihat lebih banyak pertanyaan' }).click()
  await expect(cards).toHaveCount(30)
  await page.getByLabel('Cari pertanyaan').fill('performa 58')
  await expect(cards).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Lihat lebih banyak pertanyaan' })).toHaveCount(0)
})
