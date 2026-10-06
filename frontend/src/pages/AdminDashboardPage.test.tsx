// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboardPage } from './AdminDashboardPage'
import type { AdminBooking, AdminRoom, AdminUser } from '../data/admin'

const apiMocks = vi.hoisted(() => ({
  createAdminRoom: vi.fn(),
  deleteAdminRoom: vi.fn(),
  fetchAdminDashboardSummary: vi.fn(),
  fetchAdminRevenueTimeline: vi.fn(),
  fetchAdminRooms: vi.fn(),
  fetchAdminTopRooms: vi.fn(),
  fetchAdminUsers: vi.fn(),
  uploadAdminRoomImages: vi.fn(),
  updateAdminRoom: vi.fn(),
  apiRequest: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../lib/adminApi', () => ({
  createAdminRoom: apiMocks.createAdminRoom,
  deleteAdminRoom: apiMocks.deleteAdminRoom,
  fetchAdminDashboardSummary: apiMocks.fetchAdminDashboardSummary,
  fetchAdminRevenueTimeline: apiMocks.fetchAdminRevenueTimeline,
  fetchAdminRooms: apiMocks.fetchAdminRooms,
  fetchAdminTopRooms: apiMocks.fetchAdminTopRooms,
  fetchAdminUsers: apiMocks.fetchAdminUsers,
  uploadAdminRoomImages: apiMocks.uploadAdminRoomImages,
  updateAdminRoom: apiMocks.updateAdminRoom,
}))

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api')
  return { ...actual, apiRequest: apiMocks.apiRequest }
})

vi.mock('../components/useToast', () => ({
  useToast: () => ({ success: apiMocks.success, error: apiMocks.error }),
}))

vi.mock('@mui/x-charts', () => ({
  BarChart: () => <div data-testid="admin-room-revenue-chart" />,
  LineChart: () => <div data-testid="admin-revenue-chart" />,
}))

const room: AdminRoom = {
  id: 'room-1',
  slug: 'garden-suite',
  name: 'Garden Suite',
  roomType: 'SUITE',
  shortDescription: 'Quiet garden room',
  description: 'A detailed description of the garden suite.',
  pricePerNight: 980000,
  maxGuests: 2,
  bedroomCount: 1,
  bedCount: 1,
  bathroomCount: 1,
  sizeSqm: 38,
  featuredOrder: 1,
  status: 'ACTIVE',
  occupancyRate: 70,
  coverImage: 'https://images.example.test/garden.jpg',
  images: [{
    id: 'image-1',
    name: 'Garden cover',
    url: 'https://images.example.test/garden.jpg',
    s3Key: 'rooms/garden/cover.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1234,
    altText: 'Garden',
    isCover: true,
    sortOrder: 1,
  }],
  amenities: ['Wi-Fi'],
  password: '4821',
  updatedAt: '2026-10-01',
}

const user: AdminUser = {
  id: 'user-1',
  fullName: 'Minh Anh',
  email: 'minh@example.test',
  phone: '+84912345678',
  role: 'CUSTOMER',
  status: 'ACTIVE',
  totalBookings: 2,
  joinedAt: '2026-09-01',
}

const booking: AdminBooking = {
  id: 'booking-1',
  bookingCode: 'ONI260001',
  roomId: room.id,
  roomSlug: room.slug,
  roomName: room.name,
  guestName: 'Minh Anh',
  guestEmail: 'minh@example.test',
  checkInDate: '2026-10-20',
  checkOutDate: '2026-10-22',
  totalAmount: 1960000,
  bookingSource: 'CUSTOMER_ACCOUNT',
  status: 'CONFIRMED',
  paymentStatus: 'PAID',
  createdAt: '2026-10-01',
}

function pageResult<T>(items: T[]) {
  return { items, pagination: { page: 1, limit: 10, total: items.length, totalPages: 1 } }
}

function success<T>(data: T) {
  return Promise.resolve({ data })
}

function renderPage() {
  return render(<AdminDashboardPage onAdminLogout={vi.fn()} />)
}

async function choose(label: string, option: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

async function clickNavigation(label: string, user: ReturnType<typeof userEvent.setup>) {
  const buttons = screen.getAllByRole('button', { name: label })
  await user.click(buttons[buttons.length - 1])
}

describe('AdminDashboardPage', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.setItem('oni-admin-session', JSON.stringify({ accessToken: 'test-token' }))
    apiMocks.fetchAdminDashboardSummary.mockResolvedValue({
      totalRevenue: 1960000,
      confirmedBookings: 1,
      averageOccupancyRate: 70,
      activeRooms: 1,
    })
    apiMocks.fetchAdminRevenueTimeline.mockResolvedValue([{ month: 'Th10', revenue: 1960000, bookings: 1, occupancy: 70 }])
    apiMocks.fetchAdminTopRooms.mockResolvedValue([{ roomName: room.name, revenue: 1960000 }])
    apiMocks.fetchAdminRooms.mockImplementation(() => Promise.resolve(pageResult([room])))
    apiMocks.fetchAdminUsers.mockResolvedValue(pageResult([user]))
    apiMocks.createAdminRoom.mockResolvedValue(room)
    apiMocks.updateAdminRoom.mockResolvedValue(room)
    apiMocks.uploadAdminRoomImages.mockResolvedValue([])
    apiMocks.apiRequest.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/admin/amenities') return success([{ id: 'amenity-1', code: 'WIFI', name: 'Wi-Fi', icon: 'wifi' }])
      if (path === `/admin/rooms/${room.id}`) return success(room)
      if (path === `/admin/bookings/${booking.id}`) return success(booking)
      if (path === `/admin/users/${user.id}`) return success(user)
      if (path.startsWith('/admin/bookings?')) return success(pageResult([booking]))
      if (path.startsWith('/admin/users?')) return success(pageResult([user]))
      if (path.includes('/status') && init?.method === 'PATCH') {
        const payload = JSON.parse(String(init.body)) as { status: string }
        return success({ ...booking, status: payload.status })
      }
      return success({ ...booking, status: 'REFUNDED', paymentStatus: 'REFUNDED' })
    })
  })

  it('loads live overview analytics and switches between admin tabs', async () => {
    renderPage()
    expect(await screen.findByText('Tổng doanh thu đã thu')).toBeTruthy()
    expect(await screen.findByText(/1\.960\.000/)).toBeTruthy()
    expect(apiMocks.fetchAdminDashboardSummary).toHaveBeenCalled()
    expect(apiMocks.fetchAdminRevenueTimeline).toHaveBeenCalledWith('90d')

    const user = userEvent.setup()
    await clickNavigation('Phòng & tiện nghi', user)
    expect(await screen.findByText('Garden Suite')).toBeTruthy()
    expect(await screen.findByText('Quản lý tiện nghi')).toBeTruthy()

    await clickNavigation('Booking', user)
    expect(await screen.findByText('ONI260001')).toBeTruthy()

    await clickNavigation('Người dùng', user)
    expect(await screen.findByText('minh@example.test')).toBeTruthy()
  })

  it('submits a room create payload with its password and amenities', async () => {
    renderPage()
    const userEvents = userEvent.setup()
    await clickNavigation('Phòng & tiện nghi', userEvents)
    await userEvents.click(await screen.findByRole('button', { name: 'Tạo phòng mới' }))

    fireEvent.change(screen.getByLabelText(/^Tên phòng/), { target: { value: 'River Loft' } })
    fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: 'river-loft' } })
    fireEvent.change(screen.getByLabelText(/^Loại phòng/), { target: { value: 'LOFT' } })
    fireEvent.change(screen.getByLabelText(/^Mô tả ngắn/), { target: { value: 'River view' } })
    fireEvent.change(screen.getByLabelText(/^Mô tả chi tiết/), { target: { value: 'Detailed river-view room description.' } })
    fireEvent.change(screen.getByLabelText(/^Giá \/ đêm \(VNĐ\)/), { target: { value: '1250000' } })
    fireEvent.change(screen.getByLabelText(/^Mật khẩu phòng/), { target: { value: '5931' } })
    fireEvent.change(screen.getByLabelText('Thêm tiện nghi'), { target: { value: 'Balcony' } })
    await userEvents.click(screen.getByRole('button', { name: /^Thêm$/ }))
    await userEvents.click(screen.getByRole('button', { name: 'Lưu phòng' }))

    await waitFor(() => expect(apiMocks.createAdminRoom).toHaveBeenCalledTimes(1))
    expect(apiMocks.createAdminRoom.mock.calls[0]?.[0]).toMatchObject({
      name: 'River Loft',
      slug: 'river-loft',
      roomType: 'LOFT',
      shortDescription: 'River view',
      description: 'Detailed river-view room description.',
      pricePerNight: 1250000,
      password: '5931',
      amenities: ['Balcony'],
      images: [],
    })
  })

  it('preserves existing room image metadata and password when editing', async () => {
    renderPage()
    const userEvents = userEvent.setup()
    await clickNavigation('Phòng & tiện nghi', userEvents)
    await userEvents.click(await screen.findByRole('button', { name: 'Sửa' }))

    const roomPassword = await screen.findByLabelText(/^Mật khẩu phòng/)
    expect((roomPassword as HTMLInputElement).value).toBe('4821')
    expect(screen.getByText('rooms/garden/cover.jpg')).toBeTruthy()
    await userEvents.click(screen.getByRole('button', { name: 'Lưu phòng' }))

    await waitFor(() => expect(apiMocks.updateAdminRoom).toHaveBeenCalledTimes(1))
    expect(apiMocks.updateAdminRoom).toHaveBeenCalledWith(room.id, expect.objectContaining({
      password: '4821',
      images: [expect.objectContaining({
        id: 'image-1',
        s3Key: 'rooms/garden/cover.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 1234,
        altText: 'Garden',
        isCover: true,
        sortOrder: 1,
      })],
    }))
  })

  it('uploads room images, sets cover, reorders them, and removes deleted images on save', async () => {
    const uploadedImages = [
      {
        id: '',
        name: 'Window view',
        url: 'https://images.example.test/window.jpg',
        s3Key: 'rooms/garden/window.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 2000,
        altText: 'Window',
        isCover: true,
        sortOrder: 1,
      },
      {
        id: '',
        name: 'Bedroom view',
        url: 'https://images.example.test/bedroom.jpg',
        s3Key: 'rooms/garden/bedroom.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 3000,
        altText: 'Bedroom',
        isCover: false,
        sortOrder: 2,
      },
    ]
    apiMocks.uploadAdminRoomImages.mockResolvedValue(uploadedImages)
    renderPage()
    const userEvents = userEvent.setup()
    await clickNavigation('Phòng & tiện nghi', userEvents)
    await userEvents.click(await screen.findByRole('button', { name: 'Sửa' }))

    const imageInput = document.querySelector('input[type="file"]')
    expect(imageInput).not.toBeNull()
    const file = new File(['room photo'], 'room-photo.jpg', { type: 'image/jpeg' })
    fireEvent.change(imageInput as HTMLInputElement, { target: { files: [file] } })
    expect(await screen.findByText('rooms/garden/window.jpg')).toBeTruthy()
    expect(apiMocks.uploadAdminRoomImages).toHaveBeenCalledWith([file], room.slug)

    await userEvents.click(screen.getAllByRole('checkbox', { name: 'Cover' })[2])
    await userEvents.click(screen.getByRole('button', { name: 'Đưa ảnh 3 lên trước' }))
    await userEvents.click(screen.getByRole('button', { name: 'Đưa ảnh 2 lên trước' }))
    await userEvents.click(screen.getByRole('button', { name: 'Xóa ảnh Window view' }))
    await userEvents.click(screen.getByRole('button', { name: 'Lưu phòng' }))

    await waitFor(() => expect(apiMocks.updateAdminRoom).toHaveBeenCalledTimes(1))
    expect(apiMocks.updateAdminRoom.mock.calls[0]?.[1].images).toEqual([
      expect.objectContaining({ s3Key: 'rooms/garden/bedroom.jpg', isCover: true, sortOrder: 1 }),
      expect.objectContaining({ id: 'image-1', s3Key: 'rooms/garden/cover.jpg', isCover: false, sortOrder: 2 }),
    ])
  })

  it('applies every booking filter and supports detail, status update, and refund actions', async () => {
    renderPage()
    const userEvents = userEvent.setup()
    await clickNavigation('Booking', userEvents)
    expect(await screen.findByText('ONI260001')).toBeTruthy()
    await userEvents.click(screen.getByRole('button', { name: 'Bộ lọc & tìm kiếm' }))
    fireEvent.change(screen.getByLabelText('Tìm booking'), { target: { value: booking.bookingCode } })
    await choose('Phòng', room.name)
    await choose('Trạng thái', 'Đã xác nhận')
    await choose('Thanh toán', 'Đã thanh toán')
    fireEvent.change(screen.getByLabelText('Nhận phòng từ'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Nhận phòng đến'), { target: { value: '2026-10-31' } })
    await waitFor(() => {
      const calls = apiMocks.apiRequest.mock.calls.map(([path]) => String(path))
      expect(calls).toContain('/admin/bookings?page=1&limit=3&keyword=ONI260001&roomId=room-1&status=CONFIRMED&paymentStatus=PAID&checkInFrom=2026-10-01&checkInTo=2026-10-31')
    })

    await userEvents.click(screen.getByRole('button', { name: 'Xem kết quả' }))
    await userEvents.click(await screen.findByRole('button', { name: 'Chi tiết booking ONI260001' }))
    expect(await screen.findAllByText('Customer account')).toBeTruthy()
    await choose('Trạng thái booking', 'Đã nhận phòng')
    await userEvents.click(screen.getByRole('button', { name: 'Lưu trạng thái' }))
    await waitFor(() => expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      `/admin/bookings/${booking.id}/status`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'CHECKED_IN' }) }),
    ))

    await userEvents.click(screen.getByRole('button', { name: 'Hoàn tiền' }))
    await userEvents.click(await screen.findByRole('button', { name: 'Xác nhận' }))
    await waitFor(() => expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      `/admin/bookings/${booking.id}/refund`,
      expect.objectContaining({ method: 'POST' }),
    ))
  })

  it('updates a user role and status through their dedicated admin endpoints', async () => {
    renderPage()
    const userEvents = userEvent.setup()
    await clickNavigation('Người dùng', userEvents)
    await userEvents.click(screen.getByRole('button', { name: 'Bộ lọc & tìm kiếm' }))
    fireEvent.change(screen.getByLabelText('Tìm người dùng'), { target: { value: 'minh@example.test' } })
    await choose('Vai trò', 'Khách hàng')
    await choose('Trạng thái', 'Đang hoạt động')
    await waitFor(() => expect(apiMocks.apiRequest).toHaveBeenCalledWith(
      '/admin/users?page=1&limit=3&role=CUSTOMER&status=ACTIVE&keyword=minh%40example.test',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    ))
    await userEvents.click(screen.getByRole('button', { name: 'Xem kết quả' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Bộ lọc & tìm kiếm' })).toBeNull())
    const email = await screen.findByText('minh@example.test')
    const row = email.closest('tr')
    expect(row).not.toBeNull()
    await userEvents.click(within(row as HTMLElement).getByRole('button', { name: 'Sửa' }))
    const fullName = await screen.findByLabelText(/^Họ và tên/)
    expect((fullName as HTMLInputElement).value).toBe('Minh Anh')

    await choose('Vai trò', 'Nhân viên')
    await choose('Trạng thái', 'Đã tạm khóa')
    await userEvents.click(screen.getByRole('button', { name: 'Lưu người dùng' }))

    await waitFor(() => {
      expect(apiMocks.apiRequest).toHaveBeenCalledWith(
        `/admin/users/${user.id}/role`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ role: 'STAFF' }) }),
      )
      expect(apiMocks.apiRequest).toHaveBeenCalledWith(
        `/admin/users/${user.id}/status`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'SUSPENDED' }) }),
      )
    })
  })
})
