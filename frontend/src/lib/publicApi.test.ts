import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkRoomAvailability, createGuestCheckoutBooking, fetchBookingByCode, fetchBookingPaymentStatus } from './publicApi'

afterEach(() => vi.unstubAllGlobals())
describe('booking API contracts', () => {
  it('preserves date-only query keys and numeric guest count', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [], message: '' }) })
    vi.stubGlobal('fetch', fetch)
    await checkRoomAvailability({ checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2 })
    const url = new URL(fetch.mock.calls[0][0])
    expect(url.pathname).toBe('/api/v1/rooms/availability')
    expect(Object.fromEntries(url.searchParams)).toEqual({ checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: '2' })
  })
  it('sends guest checkout unchanged and restores/polls using correct identifiers', async () => {
    const data = { bookingId: 'booking-1', bookingCode: 'ONI01' }
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data, message: '' }) })
    vi.stubGlobal('fetch', fetch)
    const payload = { roomId: 'room-1', checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2,
      guestName: 'Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567', note: 'Check-in muộn' }
    expect(await createGuestCheckoutBooking(payload)).toEqual(data)
    expect(fetch.mock.calls[0][0]).toContain('/bookings/guest-checkout')
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(payload) })
    await fetchBookingPaymentStatus('booking-1')
    await fetchBookingByCode('ONI01')
    expect(fetch.mock.calls[1][0]).toContain('/payments/booking-1/status')
    expect(fetch.mock.calls[2][0]).toContain('/bookings/code/ONI01')
  })
  it('encodes restored identifiers and surfaces NestJS validation messages', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ message: ['guestEmail must be an email', 'guestCount must be an integer number'] }),
    })
    vi.stubGlobal('fetch', fetch)
    await expect(fetchBookingByCode('code/with?query')).rejects.toThrow('guestEmail must be an email; guestCount must be an integer number')
    expect(fetch.mock.calls[0][0]).toContain('/bookings/code/code%2Fwith%3Fquery')
  })
})
