import { apiRequest } from './api'

export type PublicRoomCard = {
  id: string
  slug: string
  name: string
  roomType: string
  subtitle: string
  shortDescription: string
  description: string
  heroImage: string
  cardImage: string
  pricePerNight: number
  maxGuests: number
  size: string
  bedInfo: string
  highlight: string
  features: string[]
  amenities: string[]
  atmosphere: string[]
  checkIn: string
  checkOut: string
}

export type PublicRoomDetail = PublicRoomCard & {
  bookedDateRanges?: { checkInDate: string; checkOutDate: string }[]
  sizeSqm: number
  bedroomCount: number
  bedCount: number
  bathroomCount: number
  status: string
  images: {
    id: string
    title: string
    url: string
    altText: string
    isCover: boolean
    sortOrder: number
  }[]
  gallery: {
    title: string
    image: string
  }[]
}

export type AvailabilityResult = {
  roomId: string
  slug: string
  name: string
  roomType: string
  subtitle: string
  shortDescription: string
  heroImage: string
  cardImage: string
  available: boolean
  nightCount: number
  pricePerNight: number
  totalAmount: number
  maxGuests: number
  size: string
  bedInfo: string
  features: string[]
  atmosphere: string[]
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    fullName: string
    email: string
    phone: string
    role: string
    status: string
    mustChangePassword?: boolean
    createdAt: string
  }
}

export type BookingCheckoutResponse = {
  bookingId: string
  bookingCode: string
  bookingSource: string
  status: string
  roomPriceSnapshot: number
  totalAmount: number
  expiresAt: string
  payment: {
    paymentId: string
    provider: string
    providerOrderId: string
    checkoutUrl: string | null
    qrCodeUrl: string | null
    status: string
    expiresAt: string
  }
}

export type BookingPaymentStatus = {
  bookingId: string
  bookingCode: string
  roomName: string
  roomSlug: string
  status: string
  paymentStatus: string
  totalAmount: number
  expiresAt: string | null
  confirmedAt: string | null
  payment: {
    paymentId: string
    provider: string
    providerOrderId: string
    status: string
    checkoutUrl: string | null
    qrCodeUrl: string | null
    paidAt: string | null
  }
}

export type BookingDetail = {
  id: string
  bookingCode: string
  roomId: string
  roomName: string
  roomSlug: string
  guestName: string
  guestEmail: string | null
  guestPhone: string | null
  checkInDate: string
  checkOutDate: string
  guestCount: number
  roomPriceSnapshot: number
  totalAmount: number
  status: string
  paymentStatus: string
  note: string | null
  holdExpiresAt: string | null
  confirmedAt: string | null
  payment: {
    paymentId: string
    provider: string
    providerOrderId: string
    status: string
    checkoutUrl: string | null
    qrCodeUrl: string | null
    expiresAt: string | null
    paidAt: string | null
  } | null
}

export type PublicRoomsPage = {
  items: PublicRoomCard[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function fetchPublicRooms(page = 1, limit = 6): Promise<PublicRoomsPage> {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  const response = await apiRequest<{
    items: PublicRoomCard[]
    pagination: PublicRoomsPage['pagination']
  }>(`/rooms?${query.toString()}`)

  return response.data
}

export async function fetchRoomDetail(slug: string) {
  const response = await apiRequest<PublicRoomDetail>(`/rooms/${encodeURIComponent(slug)}`)
  return response.data
}

export async function checkRoomAvailability(params: {
  checkInDate: string
  checkOutDate: string
  guestCount: number
}) {
  const search = new URLSearchParams({
    checkInDate: params.checkInDate,
    checkOutDate: params.checkOutDate,
    guestCount: String(params.guestCount),
  })
  const response = await apiRequest<AvailabilityResult[]>(`/rooms/availability?${search.toString()}`)

  return response.data
}

export async function loginCustomer(payload: { identifier: string; password: string }) {
  const response = await apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response
}

export async function registerCustomer(payload: {
  fullName: string
  email: string
  phone: string
  password: string
}) {
  const response = await apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response
}

export async function forgotCustomerPassword(payload: { email: string }) {
  const response = await apiRequest<{ sent: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response
}

export async function createGuestCheckoutBooking(payload: {
  roomId: string
  checkInDate: string
  checkOutDate: string
  guestCount: number
  guestName: string
  guestEmail: string
  guestPhone: string
  note?: string
}) {
  const response = await apiRequest<BookingCheckoutResponse>('/bookings/guest-checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response.data
}

export async function fetchBookingPaymentStatus(bookingId: string) {
  const response = await apiRequest<BookingPaymentStatus>(`/payments/${encodeURIComponent(bookingId)}/status`)
  return response.data
}

export async function fetchBookingByCode(bookingCode: string) {
  const response = await apiRequest<BookingDetail>(`/bookings/code/${encodeURIComponent(bookingCode)}`)
  return response.data
}
