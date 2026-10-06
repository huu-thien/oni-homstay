import type { AdminBooking, AdminRoom, AdminRoomImage, AdminUser, RevenuePoint } from '../data/admin'
import { ApiError, apiRequest, type ApiSuccessResponse } from './api'
import { getAdminSession } from './adminAuth'

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

type Paginated<T> = {
  items: T[]
  pagination: Pagination
}

type RevenueSummary = {
  totalRevenue: number
  confirmedBookings: number
  averageOccupancyRate: number
  activeRooms: number
}

function getAuthHeaders() {
  const session = getAdminSession()

  if (!session?.accessToken) {
    throw new ApiError('Phiên đăng nhập admin không còn hợp lệ.')
  }

  return {
    Authorization: `Bearer ${session.accessToken}`,
  }
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<ApiSuccessResponse<T>> {
  return apiRequest<T>(path, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  })
}

export async function fetchAdminRooms(params: {
  page: number
  limit: number
  keyword?: string
  status?: string
}) {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })

  if (params.keyword) {
    search.set('keyword', params.keyword)
  }

  if (params.status && params.status !== 'ALL') {
    search.set('status', params.status)
  }

  const response = await adminRequest<Paginated<AdminRoom>>(`/admin/rooms?${search.toString()}`)
  return response.data
}

export async function createAdminRoom(payload: {
  name: string
  slug: string
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
  status: string
  amenities: string[]
  images: AdminRoomImage[]
  password?: string
}) {
  const response = await adminRequest<AdminRoom>('/admin/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return response.data
}

export async function updateAdminRoom(
  roomId: string,
  payload: {
    name: string
    slug: string
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
    status: string
    amenities: string[]
    images: AdminRoomImage[]
    password?: string
  },
) {
  const response = await adminRequest<AdminRoom>(`/admin/rooms/${roomId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return response.data
}

export async function deleteAdminRoom(roomId: string) {
  await adminRequest(`/admin/rooms/${roomId}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminBookings(params: {
  page: number
  limit: number
  roomId?: string
  status?: string
  checkInFrom?: string
  checkInTo?: string
}) {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })

  if (params.roomId && params.roomId !== 'ALL') {
    search.set('roomId', params.roomId)
  }

  if (params.status && params.status !== 'ALL') {
    search.set('status', params.status)
  }

  if (params.checkInFrom) {
    search.set('checkInFrom', params.checkInFrom)
  }

  if (params.checkInTo) {
    search.set('checkInTo', params.checkInTo)
  }

  const response = await adminRequest<Paginated<AdminBooking>>(`/admin/bookings?${search.toString()}`)
  return response.data
}

export async function fetchAdminUsers(params: {
  page: number
  limit: number
  role?: string
  status?: string
}) {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  })

  if (params.role && params.role !== 'ALL') {
    search.set('role', params.role)
  }

  if (params.status && params.status !== 'ALL') {
    search.set('status', params.status)
  }

  const response = await adminRequest<Paginated<AdminUser>>(`/admin/users?${search.toString()}`)
  return response.data
}

export async function fetchAdminDashboardSummary() {
  const response = await adminRequest<RevenueSummary>('/admin/analytics/dashboard-summary')
  return response.data
}

export async function fetchAdminRevenueTimeline(range: '30d' | '90d' | '180d') {
  const response = await adminRequest<RevenuePoint[]>(`/admin/analytics/revenue-timeline?range=${range}`)
  return response.data
}

export async function fetchAdminTopRooms() {
  const response = await adminRequest<{ roomName: string; revenue: number }[]>('/admin/analytics/top-rooms')
  return response.data
}

export async function uploadAdminRoomImages(files: File[], roomSlug: string) {
  const formData = new FormData()
  formData.set('roomSlug', roomSlug)

  for (const file of files) {
    formData.append('files', file)
  }

  const response = await adminRequest<AdminRoomImage[]>('/admin/uploads/room-images', {
    method: 'POST',
    body: formData,
  })

  return response.data
}
