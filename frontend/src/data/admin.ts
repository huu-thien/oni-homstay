export type RoomStatus = 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
export type UserStatus = 'ACTIVE' | 'PENDING_ACTIVATION' | 'SUSPENDED'
export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED'
export type BookingSource = 'GUEST_CHECKOUT' | 'CUSTOMER_ACCOUNT'

export type AdminRoomImage = {
  id?: string
  name: string
  url: string
  s3Key: string
  contentType?: string
  sizeBytes?: number
  altText?: string
  isCover: boolean
  sortOrder: number
}

export type AdminRoom = {
  id: string
  slug: string
  name: string
  roomType: string
  shortDescription: string
  description: string
  pricePerNight: number
  maxGuests: number
  bedroomCount: number
  bedCount: number
  bathroomCount: number
  sizeSqm: number
  featuredOrder: number
  status: RoomStatus
  occupancyRate: number
  coverImage: string
  images: AdminRoomImage[]
  amenities: string[]
  password?: string
  updatedAt: string
}

export type AdminUser = {
  id: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  status: UserStatus
  totalBookings: number
  joinedAt: string
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'CANCELLED'
  | 'REFUNDED'

export type AdminBooking = {
  id: string
  bookingCode: string
  roomId?: string
  roomSlug: string
  roomName: string
  guestName: string
  guestEmail: string
  checkInDate: string
  checkOutDate: string
  totalAmount: number
  bookingSource: BookingSource
  status: BookingStatus
  paymentStatus: PaymentStatus
  createdAt: string
}

export type RevenuePoint = {
  month: string
  revenue: number
  bookings: number
  occupancy: number
}
