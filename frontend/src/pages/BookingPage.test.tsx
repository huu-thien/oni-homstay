// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@mui/material'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ToastProvider } from '../components/ToastContext'
import { theme } from '../theme'
import { BookingPage } from './BookingPage'
import { checkoutToDetail, detailToPaymentStatus } from '../lib/bookingPayment'
import type { BookingCheckoutResponse, PublicRoomDetail } from '../lib/publicApi'

const api = vi.hoisted(() => ({
  fetchRoomDetail: vi.fn(), checkRoomAvailability: vi.fn(), createGuestCheckoutBooking: vi.fn(),
  fetchBookingByCode: vi.fn(), fetchBookingPaymentStatus: vi.fn(),
}))
const qr = vi.hoisted(() => ({ toDataURL: vi.fn() }))
vi.mock('../lib/publicApi', () => api)
vi.mock('qrcode', () => ({ default: qr }))
vi.mock('../components/ui', () => ({
  Button: ({ children, isLoading, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) => (
    <button {...props} disabled={props.disabled || isLoading}>{children}</button>
  ),
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  DateRangePicker: ({ checkInDate, checkOutDate, onCheckInChange, onCheckOutChange, disabled, error }: {
    checkInDate: string; checkOutDate: string; onCheckInChange: (value: string) => void
    onCheckOutChange: (value: string) => void; disabled: boolean; error?: string
  }) => <div>
    <label>Ngày nhận phòng<input id="checkInDate" value={checkInDate} disabled={disabled} onChange={(e) => onCheckInChange(e.target.value)} /></label>
    <label>Ngày trả phòng<input id="checkOutDate" value={checkOutDate} disabled={disabled} onChange={(e) => onCheckOutChange(e.target.value)} /></label>
    {error && <p>{error}</p>}
  </div>,
}))
const room: PublicRoomDetail = {
  id: 'room-1', slug: 'garden', name: 'Garden', roomType: 'SUITE', subtitle: '', shortDescription: '', description: '',
  heroImage: '', cardImage: '', pricePerNight: 1200000, maxGuests: 2, size: '', bedInfo: '', highlight: '',
  features: [], amenities: ['Wifi'], atmosphere: [], checkIn: '14:00', checkOut: '12:00',
  sizeSqm: 38, bedroomCount: 1, bedCount: 1, bathroomCount: 1, status: 'ACTIVE', images: [], gallery: [],
}
const checkout: BookingCheckoutResponse = {
  bookingId: 'booking-1', bookingCode: 'ONI01', bookingSource: 'GUEST_CHECKOUT', status: 'PENDING_PAYMENT',
  roomPriceSnapshot: 980000, totalAmount: 1960000, expiresAt: '2099-03-10T12:00:00Z',
  payment: { paymentId: 'payment-1', provider: 'PAYOS', providerOrderId: '123', checkoutUrl: 'https://pay.example/123',
    qrCodeUrl: '000201010212', status: 'PENDING', expiresAt: '2099-03-10T12:00:00Z' },
}
const input = { roomId: 'room-1', checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2,
  guestName: 'Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567' }
const detail = checkoutToDetail(checkout, input, room)
function mount(query = 'checkInDate=2099-03-10&checkOutDate=2099-03-12&guestCount=2') {
  return render(<ThemeProvider theme={theme}><ToastProvider>
    <MemoryRouter initialEntries={[`/booking/garden?${query}`]}><Routes>
      <Route path="/booking/:slug" element={<BookingPage onOpenAuth={vi.fn()} customerSession={null} />} />
    </Routes></MemoryRouter>
  </ToastProvider></ThemeProvider>)
}
async function ready() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xác nhận và thanh toán' }).hasAttribute('disabled')).toBe(false))
}
beforeEach(() => {
  vi.clearAllMocks()
  api.fetchRoomDetail.mockResolvedValue(room)
  api.checkRoomAvailability.mockResolvedValue([{ roomId: room.id, available: true }])
  api.createGuestCheckoutBooking.mockResolvedValue(checkout)
  api.fetchBookingByCode.mockResolvedValue(detail)
  api.fetchBookingPaymentStatus.mockResolvedValue(detailToPaymentStatus(detail))
  qr.toDataURL.mockResolvedValue('data:image/png;base64,AAAA')
})
afterEach(cleanup)
describe('guest checkout interactions', () => {
  it('validates contact fields before sending booking requests', async () => {
    mount(); await ready()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và thanh toán' }))
    expect(await screen.findByText('Họ tên cần từ 1 đến 150 ký tự.')).toBeTruthy()
    expect(screen.getByText('Vui lòng nhập email hợp lệ.')).toBeTruthy()
    expect(api.createGuestCheckoutBooking).not.toHaveBeenCalled()
    expect(api.checkRoomAvailability).toHaveBeenCalledTimes(1)
  })
  it('sends normalized backend payload and prevents a second checkout after creation', async () => {
    mount(); await ready()
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: ' Anh ' } })
    fireEvent.change(screen.getByLabelText(/Email nhận xác nhận/), { target: { value: 'Anh@Example.com' } })
    fireEvent.change(screen.getByLabelText(/Số điện thoại/), { target: { value: ' 0901234567 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận và thanh toán' }))
    await waitFor(() => expect(api.createGuestCheckoutBooking).toHaveBeenCalledWith({ ...input, note: undefined }))
    expect(await screen.findByText(/Mã đặt phòng:/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Xác nhận và thanh toán' })).toBeNull()
    expect(screen.getByLabelText(/Họ và tên/).hasAttribute('disabled')).toBe(true)
    await waitFor(() => expect(qr.toDataURL).toHaveBeenCalledWith('000201010212', expect.objectContaining({ width: 280 })))
    expect(api.createGuestCheckoutBooking).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: /local|mock/i })).toBeNull()
  })
  it('does not query availability or submit invalid date ranges', async () => {
    mount('checkInDate=2099-03-12&checkOutDate=2099-03-10&guestCount=2')
    await screen.findByText('Ngày trả phòng phải sau ngày nhận phòng.')
    expect(api.checkRoomAvailability).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Xác nhận và thanh toán' }).hasAttribute('disabled')).toBe(true)
  })
  it('blocks unavailable rooms', async () => {
    api.checkRoomAvailability.mockResolvedValue([])
    mount()
    expect(await screen.findByText('Phòng không còn trống. Vui lòng chọn ngày khác.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Xác nhận và thanh toán' }).hasAttribute('disabled')).toBe(true)
    expect(api.createGuestCheckoutBooking).not.toHaveBeenCalled()
  })
  it('restores server snapshot pricing and treats return URL as untrusted', async () => {
    mount('bookingCode=ONI01&payment=return')
    expect(await screen.findByText(/Mã đặt phòng:/)).toBeTruthy()
    expect(screen.getByLabelText(/Họ và tên/).getAttribute('value')).toBe('Anh')
    expect(screen.getByText(/980.000/)).toBeTruthy()
    expect(screen.queryByText(/1.200.000/)).toBeNull()
    expect(screen.queryByText(/đã được thanh toán/)).toBeNull()
    expect(api.createGuestCheckoutBooking).not.toHaveBeenCalled()
    expect(api.checkRoomAvailability).not.toHaveBeenCalled()
  })
  it('surfaces hydration errors instead of creating a replacement booking silently', async () => {
    api.fetchBookingByCode.mockRejectedValue(new Error('network'))
    mount('bookingCode=ONI01')
    expect(await screen.findByText('Không thể khôi phục đơn đặt phòng. Vui lòng thử lại.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Xác nhận và thanh toán' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Bắt đầu đặt phòng mới' })).toBeTruthy()
    expect(api.createGuestCheckoutBooking).not.toHaveBeenCalled()
  })
  it('rejects restored bookings belonging to another room', async () => {
    api.fetchBookingByCode.mockResolvedValue({ ...detail, roomSlug: 'other-room' })
    mount('bookingCode=ONI01')
    expect(await screen.findByText(/Mã đặt phòng không thuộc phòng đang xem/)).toBeTruthy()
    expect(screen.queryByText(/Mã đặt phòng:/)).toBeNull()
  })
  it('keeps a created order when payment status fetch fails', async () => {
    api.fetchBookingPaymentStatus.mockRejectedValue(new Error('network'))
    mount('bookingCode=ONI01')
    expect(await screen.findByText(/Chưa thể cập nhật thanh toán/)).toBeTruthy()
    expect(screen.getByText(/Mã đặt phòng:/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Xác nhận và thanh toán' })).toBeNull()
  })
})
