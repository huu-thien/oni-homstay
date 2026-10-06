import { describe, expect, it } from 'vitest'
import { checkoutToDetail, detailToPaymentStatus, isPaymentPending, safeWebUrl } from './bookingPayment'
import type { BookingCheckoutResponse, PublicRoomDetail } from './publicApi'

const checkout: BookingCheckoutResponse = {
  bookingId: 'booking-1', bookingCode: 'ONI01', bookingSource: 'GUEST_CHECKOUT', status: 'PENDING_PAYMENT',
  roomPriceSnapshot: 980000, totalAmount: 1960000, expiresAt: '2099-03-10T12:00:00Z',
  payment: { paymentId: 'payment-1', provider: 'PAYOS', providerOrderId: '123', checkoutUrl: 'https://pay.example/123',
    qrCodeUrl: '000201010212', status: 'PENDING', expiresAt: '2099-03-10T12:00:00Z' },
}
const input = { roomId: 'room-1', checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2,
  guestName: 'Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567' }
const room: PublicRoomDetail = {
  id: 'room-1', slug: 'garden', name: 'Garden', roomType: 'SUITE', subtitle: '', shortDescription: '', description: '',
  heroImage: '', cardImage: '', pricePerNight: 1200000, maxGuests: 2, size: '', bedInfo: '', highlight: '',
  features: [], amenities: [], atmosphere: [], checkIn: '14:00', checkOut: '12:00',
  sizeSqm: 38, bedroomCount: 1, bedCount: 1, bathroomCount: 1, status: 'ACTIVE', images: [], gallery: [],
}
describe('payment mappings', () => {
  it('keeps backend price snapshots instead of recomputing from updated room prices', () => {
    const detail = checkoutToDetail(checkout, input, room)
    expect(detail.roomPriceSnapshot).toBe(980000)
    expect(detail.totalAmount).toBe(1960000)
    expect(detailToPaymentStatus(detail)).toMatchObject({
      bookingId: 'booking-1', totalAmount: 1960000, payment: { qrCodeUrl: checkout.payment.qrCodeUrl, provider: 'PAYOS' },
    })
  })
  it('does not invent a mock payment when a restored booking has none', () => {
    expect(detailToPaymentStatus({ ...checkoutToDetail(checkout, input, room), payment: null })).toBeNull()
  })
  it('recognizes terminal booking states even when payment has not caught up', () => {
    const status = detailToPaymentStatus(checkoutToDetail(checkout, input, room))!
    expect(isPaymentPending(status)).toBe(true)
    expect(isPaymentPending({ ...status, status: 'CANCELLED' })).toBe(false)
    expect(isPaymentPending({ ...status, paymentStatus: 'EXPIRED' })).toBe(false)
    expect(isPaymentPending({ ...status, payment: { ...status.payment, status: 'PAID' } })).toBe(false)
  })
  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', '000201010212', null])('rejects unsafe or non-URL checkout values %s', (value) => {
    expect(safeWebUrl(value)).toBeUndefined()
  })
  it('accepts a real gateway URL', () => {
    expect(safeWebUrl(checkout.payment.checkoutUrl)).toBe(checkout.payment.checkoutUrl)
  })
})
