import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import type * as Axe from 'axe-core'

declare global { interface Window { axe: typeof Axe } }
const require = createRequire(import.meta.url)
test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: 'reduce' }) })
const room = {
  id: 'room-1', slug: 'garden', name: 'Garden', roomType: 'SUITE', subtitle: 'Một nơi nghỉ yên tĩnh',
  shortDescription: 'Phòng nghỉ dành cho hai người', description: 'Không gian yên tĩnh tại Huế.',
  heroImage: '', cardImage: '', pricePerNight: 980000, maxGuests: 2, size: '38 m²', bedInfo: '1 giường',
  highlight: '', features: ['Wifi'], amenities: ['Wifi'], atmosphere: [], checkIn: '14:00', checkOut: '12:00',
  sizeSqm: 38, bedroomCount: 1, bedCount: 1, bathroomCount: 1, status: 'ACTIVE', images: [], gallery: [],
  bookedDateRanges: [{ checkInDate: '2099-03-15', checkOutDate: '2099-03-18' }],
}
const checkout = {
  bookingId: 'booking-1', bookingCode: 'ONI01', bookingSource: 'GUEST_CHECKOUT', status: 'PENDING_PAYMENT',
  roomPriceSnapshot: 980000, totalAmount: 1960000, expiresAt: '2099-03-10T12:00:00Z',
  payment: { paymentId: 'payment-1', provider: 'PAYOS', providerOrderId: '123', checkoutUrl: 'https://pay.example/123',
    qrCodeUrl: '000201010212', status: 'PENDING', expiresAt: '2099-03-10T12:00:00Z' },
}
const payment = {
  bookingId: checkout.bookingId, bookingCode: checkout.bookingCode, roomName: room.name, roomSlug: room.slug,
  status: 'PENDING_PAYMENT', paymentStatus: 'PENDING', totalAmount: checkout.totalAmount,
  expiresAt: checkout.expiresAt, confirmedAt: null, payment: { ...checkout.payment, paidAt: null },
}
async function mockApi(page: Page, paid = false) {
  const roomCatalog = Array.from({ length: 6 }, (_, index) => ({
    ...room,
    id: index === 0 ? room.id : `room-${index + 1}`,
    slug: index === 0 ? room.slug : `garden-${index + 1}`,
    name: index === 0 ? room.name : `Garden ${index + 1}`,
  }))
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    let data: unknown
    if (url.pathname.endsWith('/rooms/availability')) data = [{ ...room, roomId: room.id, available: true, nightCount: 2, totalAmount: 1960000 }]
    else if (url.pathname.endsWith('/rooms/garden')) data = room
    else if (url.pathname.endsWith('/rooms')) {
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      data = { items: requestedPage === 1 ? roomCatalog : [{ ...room, id: 'room-7', slug: 'garden-7', name: 'Garden 7' }],
        pagination: { page: requestedPage, limit: 6, total: 7, totalPages: 2 } }
    }
    else if (url.pathname.endsWith('/guest-checkout')) data = checkout
    else if (url.pathname.endsWith('/status')) data = paid
      ? { ...payment, status: 'CONFIRMED', paymentStatus: 'PAID', payment: { ...payment.payment, status: 'PAID' } } : payment
    else throw new Error(`Unexpected API request: ${url.pathname}`)
    await route.fulfill({ json: { success: true, data, message: '' } })
  })
}
async function accessibility(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const violations = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
    return result.violations.map((item) => ({ id: item.id, impact: item.impact, nodes: item.nodes.map((node) => node.target) }))
  })
  expect(violations).toEqual([])
}
for (const width of [390, 768, 1440]) {
  test(`booking responsive and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await mockApi(page)
    await page.goto('/booking/garden?checkInDate=2099-03-10&checkOutDate=2099-03-12&guestCount=2')
    await expect(page.getByRole('button', { name: 'Xác nhận và thanh toán' })).toBeEnabled()
    expect(await page.getByLabel('Họ và tên').evaluate((input) => input.closest('.MuiInputBase-root')!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(54)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await accessibility(page)
    await page.getByRole('button', { name: /Chọn ngày|Choose date/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('gridcell', { name: '15', exact: true })).toBeDisabled()
    await expect(page.getByRole('gridcell', { name: '18', exact: true })).toBeEnabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await accessibility(page)
    await page.keyboard.press('Escape')
  })
}
test('pending payment displays the QR code beside the order summary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockApi(page)
  await page.goto('/booking/garden?checkInDate=2099-03-10&checkOutDate=2099-03-12&guestCount=2')
  await page.getByLabel('Họ và tên', { exact: false }).fill('Anh')
  await page.getByLabel('Email nhận xác nhận', { exact: false }).fill('anh@example.com')
  await page.getByLabel('Số điện thoại', { exact: false }).fill('0901234567')
  await page.getByRole('button', { name: 'Xác nhận và thanh toán' }).click()
  await expect(page.getByRole('img', { name: /Mã QR thanh toán/ })).toBeVisible()
  await expect(page.getByText('Tổng thanh toán', { exact: true })).toBeVisible()
  await accessibility(page)
})
test('real browser checkout preserves payload and shows verified confirmation', async ({ page }) => {
  await mockApi(page, true)
  await page.goto('/booking/garden?checkInDate=2099-03-10&checkOutDate=2099-03-12&guestCount=2')
  await expect(page.getByRole('button', { name: 'Xác nhận và thanh toán' })).toBeEnabled()
  await page.getByLabel('Họ và tên', { exact: false }).fill(' Anh ')
  await page.getByLabel('Email nhận xác nhận', { exact: false }).fill('Anh@Example.com')
  await page.getByLabel('Số điện thoại', { exact: false }).fill('0901234567')
  const request = page.waitForRequest((item) => item.url().endsWith('/bookings/guest-checkout'))
  await page.getByRole('button', { name: 'Xác nhận và thanh toán' }).click()
  expect((await request).postDataJSON()).toEqual({
    roomId: 'room-1', checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2,
    guestName: 'Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567',
  })
  await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/bookingCode=ONI01/)
  await expect(page.getByRole('button', { name: 'Xác nhận và thanh toán' })).toHaveCount(0)
  await accessibility(page)
})
test('public home and room detail remain mobile accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await mockApi(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Garden', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await accessibility(page)
  await page.getByRole('button', { name: 'Trang tiếp' }).click()
  await expect(page.getByRole('heading', { name: 'Garden 7', exact: true })).toBeVisible()
  await accessibility(page)
  await page.goto('/rooms/garden?checkInDate=2099-03-10&checkOutDate=2099-03-12&guestCount=2')
  await expect(page.getByRole('heading', { name: 'Garden', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await accessibility(page)
})
