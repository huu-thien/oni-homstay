import { expect, test, type Page } from '@playwright/test'
import { createRequire } from 'node:module'
import type * as Axe from 'axe-core'

declare global { interface Window { axe: typeof Axe } }
const require = createRequire(import.meta.url)
async function checkA11y(page: Page) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
  const issues = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })
    return result.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) }))
  })
  expect(issues).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const heights = await page.evaluate(() => ({ page: document.documentElement.scrollHeight, viewport: window.innerHeight }))
  expect(heights.page).toBeLessThanOrEqual(heights.viewport)
}
for (const [width, height] of [[390, 900], [1440, 768], [390, 600], [1440, 600]]) {
  test(`admin navigation and populated lists fit ${width}x${height}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript(() => {
      sessionStorage.setItem('oni-admin-session', JSON.stringify({
        accessToken: 'test-only-token', refreshToken: 'test-only-refresh',
        user: { id: 'admin-1', fullName: 'Quản trị viên', email: 'admin@example.com', phone: '0901234567',
          role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-01' },
      }))
    })
    await page.route('**/api/v1/admin/**', async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      const limit = Number(url.searchParams.get('limit') ?? 3)
      const requestedPage = Number(url.searchParams.get('page') ?? 1)
      const roomList = Array.from({ length: 12 }, (_, index) => ({
        id: `room-${index}`, slug: `garden-${index}`, name: `Garden Suite ${index + 1}`,
        roomType: 'SUITE', shortDescription: 'Phòng nghỉ yên tĩnh', pricePerNight: 980000,
        maxGuests: 2, status: 'ACTIVE', occupancyRate: 70, coverImage: '', images: [],
        amenities: [], updatedAt: '2026-10-01',
      }))
      const items = path.endsWith('/rooms') ? roomList
        : path.endsWith('/users') ? roomList.map((_, index) => ({
          id: `user-${index}`, fullName: `Khách ${index + 1}`, email: `guest${index}@example.test`,
          phone: '0901234567', role: 'CUSTOMER', status: 'ACTIVE', totalBookings: 2, joinedAt: '2026-09-01',
        }))
        : roomList.map((room, index) => ({
          id: `booking-${index}`, bookingCode: `ONI${index}`, roomName: room.name, guestName: `Khách ${index}`,
          guestEmail: `guest${index}@example.test`, checkInDate: '2099-03-10', checkOutDate: '2099-03-12',
          totalAmount: 1960000, bookingSource: 'GUEST_CHECKOUT', status: 'PENDING_PAYMENT', paymentStatus: 'UNPAID',
        }))
      const data = path.endsWith('/dashboard-summary')
        ? { totalRevenue: 0, confirmedBookings: 0, averageOccupancyRate: 0, activeRooms: 0 }
        : path.endsWith('/revenue-timeline') ? [{ month: 'Th10', revenue: 1960000, bookings: 1, occupancy: 70 }]
        : path.endsWith('/top-rooms') ? roomList.map((room) => ({ roomName: room.name, revenue: 1960000 }))
        : path.endsWith('/amenities') ? roomList.map((_, index) => ({ id: `amenity-${index}`, code: `WIFI_${index}`, name: `Tiện nghi ${index}`, icon: 'wifi' }))
        : { items: items.slice((requestedPage - 1) * limit, requestedPage * limit), pagination: { page: requestedPage, limit, total: 12, totalPages: Math.ceil(12 / limit) } }
      await route.fulfill({ json: { success: true, data, message: '' } })
    })
    await page.goto('/admin')
    const navigate = async (name: string) => {
      if (width < 1024) await page.getByRole('button', { name: 'Mở menu quản trị' }).click()
      await page.getByRole('button', { name, exact: true }).click()
      if (width < 1024) await expect(page.locator('.MuiDrawer-modal')).toBeHidden()
      await expect(page.getByRole('heading', { name: name === 'Người dùng' ? /người dùng/i : name === 'Booking' ? /booking/i : /phòng/i }).first()).toBeVisible()
      await checkA11y(page)
    }
    if (width < 1024) await expect(page.getByRole('button', { name: 'Mở menu quản trị' })).toBeVisible()
    else await expect(page.getByRole('button', { name: 'Booking', exact: true })).toBeVisible()
    await expect(page.getByText('Xu hướng doanh thu trong kỳ đã chọn')).toBeVisible()
    await checkA11y(page)
    await page.getByRole('tab', { name: 'Theo phòng', exact: true }).click()
    await expect(page.getByText('Các phòng có doanh thu cao nhất')).toBeVisible()
    await checkA11y(page)
    await page.getByRole('tab', { name: 'Tình hình phòng', exact: true }).click()
    await checkA11y(page)
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click()
    await checkA11y(page)
    if (width === 390) {
      await page.getByRole('button', { name: 'Mở menu quản trị' }).click()
      await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toHaveCount(1)
      await page.keyboard.press('Escape')
    } else {
      await expect(page.getByRole('button', { name: 'Đăng xuất', exact: true })).toHaveCount(1)
    }
    await expect(page.getByRole('main').getByRole('button', { name: 'Đăng xuất', exact: true })).toHaveCount(0)
    await navigate('Booking')
    await expect(page.getByText('Chưa thanh toán', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click()
    await checkA11y(page)
    await navigate('Người dùng')
    await navigate('Phòng & tiện nghi')
    await page.getByRole('button', { name: 'Bộ lọc & tìm kiếm', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.getByRole('combobox', { name: 'Trạng thái', exact: true }).evaluate((select) =>
      getComputedStyle(select.closest('.MuiOutlinedInput-root')!).backgroundColor)).toBe('rgb(255, 255, 255)')
    await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await checkA11y(page)
    await page.getByRole('tab', { name: 'Quản lý tiện nghi' }).click()
    await checkA11y(page)
  })
}
