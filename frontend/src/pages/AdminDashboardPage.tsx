import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode, type RefObject } from 'react'
import {
  Alert,
  AppBar,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import BarChartIcon from '@mui/icons-material/BarChart'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GroupIcon from '@mui/icons-material/Group'
import HotelIcon from '@mui/icons-material/Hotel'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import SaveIcon from '@mui/icons-material/Save'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { BarChart, LineChart } from '@mui/x-charts'
import logoImg from '../assets/logo.png'
import { Badge } from '../components/ui'
import { useToast } from '../components/useToast'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import type {
  AdminBooking,
  AdminRoom,
  AdminRoomImage,
  AdminUser,
  BookingStatus,
  PaymentStatus,
  RevenuePoint,
  RoomStatus,
  UserRole,
  UserStatus,
} from '../data/admin'
import { ApiError, apiRequest } from '../lib/api'
import {
  createAdminRoom,
  deleteAdminRoom,
  fetchAdminDashboardSummary,
  fetchAdminRevenueTimeline,
  fetchAdminRooms,
  fetchAdminTopRooms,
  uploadAdminRoomImages,
  updateAdminRoom,
} from '../lib/adminApi'
import { getAdminSession } from '../lib/adminAuth'
import { formatCurrency } from '../lib/format'

type AdminTab = 'overview' | 'rooms' | 'bookings' | 'users'
type AdminDashboardPageProps = { onAdminLogout: () => void }
type Amenity = { id: string; code: string; name: string; icon?: string | null }
type PageResult<T> = { items: T[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
type Summary = { totalRevenue: number; confirmedBookings: number; averageOccupancyRate: number; activeRooms: number }
type RoomFormState = {
  id?: string
  name: string
  slug: string
  roomType: string
  shortDescription: string
  description: string
  pricePerNight: string
  maxGuests: string
  bedroomCount: string
  bedCount: string
  bathroomCount: string
  sizeSqm: string
  featuredOrder: string
  status: RoomStatus
  password: string
  amenities: string[]
  amenityDraft: string
  images: AdminRoomImage[]
}
type UserFormState = {
  id?: string
  fullName: string
  email: string
  phone: string
  password: string
  role: UserRole
  status: UserStatus
}
type AmenityFormState = { id?: string; code: string; name: string; icon: string }
type ConfirmTarget = { kind: 'room'; item: AdminRoom } | { kind: 'amenity'; item: Amenity }

const drawerWidth = 264
function useViewportPageSize() {
  const shortViewport = useMediaQuery('(max-height: 759px)')
  return shortViewport ? 1 : 3
}
const emptyRoomForm: RoomFormState = {
  name: '',
  slug: '',
  roomType: '',
  shortDescription: '',
  description: '',
  pricePerNight: '',
  maxGuests: '2',
  bedroomCount: '1',
  bedCount: '1',
  bathroomCount: '1',
  sizeSqm: '25',
  featuredOrder: '0',
  status: 'ACTIVE',
  password: '',
  amenities: [],
  amenityDraft: '',
  images: [],
}
const emptyUserForm: UserFormState = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'CUSTOMER',
  status: 'ACTIVE',
}
const emptyAmenityForm: AmenityFormState = { code: '', name: '', icon: '' }
const bookingStatuses: BookingStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'CHECKED_IN',
  'CHECKED_OUT',
  'CANCELLED',
  'REFUNDED',
]

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = getAdminSession()?.accessToken
  if (!accessToken) throw new ApiError('Phiên đăng nhập admin không còn hợp lệ.')
  const response = await apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  })
  return response.data
}

function jsonBody(value: unknown, method: 'POST' | 'PATCH' = 'POST'): RequestInit {
  return { method, body: JSON.stringify(value) }
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

function moveImage(images: AdminRoomImage[], index: number, offset: number) {
  const nextIndex = index + offset
  if (nextIndex < 0 || nextIndex >= images.length) return images
  const next = [...images]
  ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
  return next.map((image, order) => ({ ...image, sortOrder: order + 1 }))
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !seen.has(item.id))]
}

export function AdminDashboardPage({ onAdminLogout }: AdminDashboardPageProps) {
  const pageSize = useViewportPageSize()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [topRooms, setTopRooms] = useState<{ roomName: string; revenue: number }[]>([])
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '180d'>('90d')
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [rooms, setRooms] = useState<AdminRoom[]>([])
  const [roomOptions, setRoomOptions] = useState<AdminRoom[]>([])
  const [roomSearch, setRoomSearch] = useState('')
  const [roomStatus, setRoomStatus] = useState<'ALL' | RoomStatus>('ALL')
  const [roomPage, setRoomPage] = useState(1)
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsLoadingMore, setRoomsLoadingMore] = useState(false)
  const [roomsHasMore, setRoomsHasMore] = useState(false)
  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm)
  const [roomDialogOpen, setRoomDialogOpen] = useState(false)
  const [roomSaving, setRoomSaving] = useState(false)
  const [imagesUploading, setImagesUploading] = useState(false)
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [amenitiesLoading, setAmenitiesLoading] = useState(false)
  const [amenityForm, setAmenityForm] = useState<AmenityFormState>(emptyAmenityForm)
  const [amenityDialogOpen, setAmenityDialogOpen] = useState(false)
  const [amenitySaving, setAmenitySaving] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [bookingPage, setBookingPage] = useState(1)
  const [bookingKeyword, setBookingKeyword] = useState('')
  const [bookingRoomId, setBookingRoomId] = useState('ALL')
  const [bookingStatus, setBookingStatus] = useState<'ALL' | BookingStatus>('ALL')
  const [paymentStatus, setPaymentStatus] = useState<'ALL' | PaymentStatus>('ALL')
  const [checkInFrom, setCheckInFrom] = useState('')
  const [checkInTo, setCheckInTo] = useState('')
  const [bookingsLoading, setBookingsLoading] = useState(true)
  const [bookingsLoadingMore, setBookingsLoadingMore] = useState(false)
  const [bookingsHasMore, setBookingsHasMore] = useState(false)
  const [bookingDetail, setBookingDetail] = useState<AdminBooking | null>(null)
  const [bookingStatusDraft, setBookingStatusDraft] = useState<BookingStatus>('PENDING_PAYMENT')
  const [bookingAction, setBookingAction] = useState<'cancel' | 'refund' | null>(null)
  const [bookingSaving, setBookingSaving] = useState(false)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [userPage, setUserPage] = useState(1)
  const [userKeyword, setUserKeyword] = useState('')
  const [userRole, setUserRole] = useState<'ALL' | UserRole>('ALL')
  const [userStatus, setUserStatus] = useState<'ALL' | UserStatus>('ALL')
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersLoadingMore, setUsersLoadingMore] = useState(false)
  const [usersHasMore, setUsersHasMore] = useState(false)
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm)
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [userSaving, setUserSaving] = useState(false)

  const refreshRooms = useCallback(async (page = 1) => {
    const result = await fetchAdminRooms({
      page,
      limit: pageSize,
      keyword: roomSearch,
      status: roomStatus,
    })
    setRooms((current) => page === 1 ? result.items : mergeById(current, result.items))
    setRoomPage(page)
    setRoomsHasMore(page < Math.max(1, result.pagination.totalPages))
  }, [roomSearch, roomStatus, pageSize])

  const refreshBookings = useCallback(async (page = 1) => {
    const query = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (bookingKeyword.trim()) query.set('keyword', bookingKeyword.trim())
    if (bookingRoomId !== 'ALL') query.set('roomId', bookingRoomId)
    if (bookingStatus !== 'ALL') query.set('status', bookingStatus)
    if (paymentStatus !== 'ALL') query.set('paymentStatus', paymentStatus)
    if (checkInFrom) query.set('checkInFrom', checkInFrom)
    if (checkInTo) query.set('checkInTo', checkInTo)
    const result = await adminRequest<PageResult<AdminBooking>>(`/admin/bookings?${query.toString()}`)
    setBookings((current) => page === 1 ? result.items : mergeById(current, result.items))
    setBookingPage(page)
    setBookingsHasMore(page < Math.max(1, result.pagination.totalPages))
  }, [bookingKeyword, bookingRoomId, bookingStatus, paymentStatus, checkInFrom, checkInTo, pageSize])

  const refreshUsers = useCallback(async (page = 1) => {
    const query = new URLSearchParams({ page: String(page), limit: String(pageSize) })
    if (userRole !== 'ALL') query.set('role', userRole)
    if (userStatus !== 'ALL') query.set('status', userStatus)
    if (userKeyword.trim()) query.set('keyword', userKeyword.trim())
    const result = await adminRequest<PageResult<AdminUser>>(`/admin/users?${query.toString()}`)
    setUsers((current) => page === 1 ? result.items : mergeById(current, result.items))
    setUserPage(page)
    setUsersHasMore(page < Math.max(1, result.pagination.totalPages))
  }, [userRole, userStatus, userKeyword, pageSize])

  useEffect(() => {
    let current = true
    setOverviewLoading(true)
    Promise.all([
      fetchAdminDashboardSummary(),
      fetchAdminRevenueTimeline(dateRange),
      fetchAdminTopRooms(),
    ])
      .then(([nextSummary, nextRevenue, nextRooms]) => {
        if (!current) return
        setSummary(nextSummary)
        setRevenue(nextRevenue)
        setTopRooms(nextRooms)
      })
      .catch((error: unknown) => {
        if (current) setErrorMessage(errorText(error, 'Không thể tải dữ liệu tổng quan.'))
      })
      .finally(() => {
        if (current) setOverviewLoading(false)
      })
    return () => {
      current = false
    }
  }, [dateRange])

  useEffect(() => {
    if (activeTab !== 'rooms') return
    let current = true
    setRoomsLoading(true)
    refreshRooms(1)
      .catch((error: unknown) => {
        if (current) setErrorMessage(errorText(error, 'Không thể tải danh sách phòng.'))
      })
      .finally(() => {
        if (current) setRoomsLoading(false)
      })
    return () => {
      current = false
    }
  }, [activeTab, refreshRooms, roomSearch, roomStatus, pageSize])

  useEffect(() => {
    if (activeTab !== 'rooms' && activeTab !== 'bookings') return
    let current = true
    fetchAdminRooms({ page: 1, limit: 100, status: 'ALL' })
      .then((result) => {
        if (current) setRoomOptions(result.items)
      })
      .catch((error: unknown) => {
        if (current) setErrorMessage(errorText(error, 'Không thể tải danh sách phòng.'))
      })
    return () => {
      current = false
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'bookings') return
    let current = true
    setBookingsLoading(true)
    refreshBookings(1)
      .catch((error: unknown) => {
        if (current) setErrorMessage(errorText(error, 'Không thể tải danh sách booking.'))
      })
      .finally(() => {
        if (current) setBookingsLoading(false)
      })
    return () => {
      current = false
    }
  }, [activeTab, refreshBookings, bookingKeyword, bookingRoomId, bookingStatus, paymentStatus, checkInFrom, checkInTo, pageSize])

  useEffect(() => {
    if (activeTab !== 'users') return
    let current = true
    setUsersLoading(true)
    refreshUsers(1)
      .catch((error: unknown) => {
        if (current) setErrorMessage(errorText(error, 'Không thể tải danh sách người dùng.'))
      })
      .finally(() => {
        if (current) setUsersLoading(false)
      })
    return () => {
      current = false
    }
  }, [activeTab, refreshUsers, userRole, userStatus, userKeyword, pageSize])

  useEffect(() => {
    if (activeTab !== 'rooms' || amenities.length > 0) return
    setAmenitiesLoading(true)
    adminRequest<Amenity[]>('/admin/amenities')
      .then(setAmenities)
      .catch((error: unknown) => setErrorMessage(errorText(error, 'Không thể tải danh sách tiện nghi.')))
      .finally(() => setAmenitiesLoading(false))
  }, [activeTab, amenities.length])

  const loadMoreRooms = useCallback(async () => {
    if (activeTab !== 'rooms' || roomsLoading || roomsLoadingMore || !roomsHasMore) return
    setRoomsLoadingMore(true)
    try {
      await refreshRooms(roomPage + 1)
    } catch (error) {
      setErrorMessage(errorText(error, 'Không thể tải thêm phòng.'))
    } finally {
      setRoomsLoadingMore(false)
    }
  }, [activeTab, roomPage, roomsHasMore, roomsLoading, roomsLoadingMore, refreshRooms])

  const loadMoreBookings = useCallback(async () => {
    if (activeTab !== 'bookings' || bookingsLoading || bookingsLoadingMore || !bookingsHasMore) return
    setBookingsLoadingMore(true)
    try {
      await refreshBookings(bookingPage + 1)
    } catch (error) {
      setErrorMessage(errorText(error, 'Không thể tải thêm booking.'))
    } finally {
      setBookingsLoadingMore(false)
    }
  }, [activeTab, bookingPage, bookingsHasMore, bookingsLoading, bookingsLoadingMore, refreshBookings])

  const loadMoreUsers = useCallback(async () => {
    if (activeTab !== 'users' || usersLoading || usersLoadingMore || !usersHasMore) return
    setUsersLoadingMore(true)
    try {
      await refreshUsers(userPage + 1)
    } catch (error) {
      setErrorMessage(errorText(error, 'Không thể tải thêm người dùng.'))
    } finally {
      setUsersLoadingMore(false)
    }
  }, [activeTab, userPage, usersHasMore, usersLoading, usersLoadingMore, refreshUsers])

  const roomListSentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: activeTab === 'rooms' && roomsHasMore && !roomsLoading && !roomsLoadingMore,
    onLoadMore: loadMoreRooms,
  })

  const bookingListSentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: activeTab === 'bookings' && bookingsHasMore && !bookingsLoading && !bookingsLoadingMore,
    onLoadMore: loadMoreBookings,
  })

  const userListSentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: activeTab === 'users' && usersHasMore && !usersLoading && !usersLoadingMore,
    onLoadMore: loadMoreUsers,
  })

  const openCreateRoom = () => {
    setRoomForm({ ...emptyRoomForm, images: [] })
    setRoomDialogOpen(true)
  }

  const openEditRoom = async (room: AdminRoom) => {
    setRoomSaving(true)
    try {
      const detail = await adminRequest<AdminRoom>(`/admin/rooms/${room.id}`)
      setRoomForm({
        id: detail.id,
        name: detail.name,
        slug: detail.slug,
        roomType: detail.roomType,
        shortDescription: detail.shortDescription,
        description: detail.description,
        pricePerNight: String(detail.pricePerNight),
        maxGuests: String(detail.maxGuests),
        bedroomCount: String(detail.bedroomCount),
        bedCount: String(detail.bedCount),
        bathroomCount: String(detail.bathroomCount),
        sizeSqm: String(detail.sizeSqm),
        featuredOrder: String(detail.featuredOrder),
        status: detail.status,
        password: detail.password ?? '',
        amenities: detail.amenities ?? [],
        amenityDraft: '',
        images: [...(detail.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
      })
      setRoomDialogOpen(true)
    } catch (error) {
      const message = errorText(error, 'Không thể tải thông tin phòng.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setRoomSaving(false)
    }
  }

  const setRoomField = <K extends keyof RoomFormState>(key: K, value: RoomFormState[K]) => {
    setRoomForm((current) => ({ ...current, [key]: value }))
  }

  const addAmenityToRoom = () => {
    const name = roomForm.amenityDraft.trim()
    if (!name || roomForm.amenities.some((item) => item.toLowerCase() === name.toLowerCase())) return
    setRoomForm((current) => ({ ...current, amenities: [...current.amenities, name], amenityDraft: '' }))
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return
    setImagesUploading(true)
    try {
      const uploaded = await uploadAdminRoomImages(Array.from(files), roomForm.slug || 'draft-room')
      setRoomForm((current) => {
        const existing = current.images
        const hasCover = existing.some((image) => image.isCover)
        const additions = uploaded.map((image, index) => ({
          ...image,
          id: undefined,
          isCover: !hasCover && index === 0,
          sortOrder: existing.length + index + 1,
        }))
        return { ...current, images: [...existing, ...additions] }
      })
      toast.success('Đã tải ảnh lên.')
    } catch (error) {
      const message = errorText(error, 'Không thể tải ảnh lên.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setImagesUploading(false)
      event.target.value = ''
    }
  }

  const saveRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const required = [
      roomForm.name,
      roomForm.slug,
      roomForm.roomType,
      roomForm.shortDescription,
      roomForm.description,
      roomForm.pricePerNight,
    ]
    if (required.some((value) => !value.trim()) || !Number.isInteger(Number(roomForm.pricePerNight))) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc và giá hợp lệ.')
      return
    }
    const numbers = [
      roomForm.maxGuests,
      roomForm.bedroomCount,
      roomForm.bedCount,
      roomForm.bathroomCount,
      roomForm.sizeSqm,
      roomForm.featuredOrder,
    ].map(Number)
    if (numbers.some((number, index) => !Number.isInteger(number) || number < (index === 5 ? 0 : 1))) {
      toast.error('Kiểm tra lại các số lượng và thứ tự nổi bật.')
      return
    }
    if (roomForm.images.length && roomForm.images.filter((image) => image.isCover).length !== 1) {
      toast.error('Vui lòng chọn chính xác một ảnh cover.')
      return
    }
    setRoomSaving(true)
    const payload = {
      name: roomForm.name.trim(),
      slug: roomForm.slug.trim(),
      roomType: roomForm.roomType.trim(),
      shortDescription: roomForm.shortDescription.trim(),
      description: roomForm.description.trim(),
      pricePerNight: Number(roomForm.pricePerNight),
      maxGuests: Number(roomForm.maxGuests),
      bedroomCount: Number(roomForm.bedroomCount),
      bedCount: Number(roomForm.bedCount),
      bathroomCount: Number(roomForm.bathroomCount),
      sizeSqm: Number(roomForm.sizeSqm),
      featuredOrder: Number(roomForm.featuredOrder),
      status: roomForm.status,
      password: roomForm.password,
      amenities: roomForm.amenities,
      images: roomForm.images.map((image, index) => ({
        ...image,
        id: image.id || undefined,
        sortOrder: index + 1,
      })),
    }
    try {
      if (roomForm.id) await updateAdminRoom(roomForm.id, payload)
      else await createAdminRoom(payload)
      await refreshRooms()
      const options = await fetchAdminRooms({ page: 1, limit: 100, status: 'ALL' })
      setRoomOptions(options.items)
      setRoomDialogOpen(false)
      toast.success(roomForm.id ? 'Đã cập nhật phòng.' : 'Đã tạo phòng.')
      fetchAdminDashboardSummary().then(setSummary).catch(() => undefined)
    } catch (error) {
      const message = errorText(error, 'Không thể lưu thông tin phòng.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setRoomSaving(false)
    }
  }

  const removeRoom = async (room: AdminRoom) => {
    setConfirmTarget({ kind: 'room', item: room })
  }

  const removeAmenity = async (amenity: Amenity) => {
    setConfirmTarget({ kind: 'amenity', item: amenity })
  }

  const confirmDeletion = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      if (confirmTarget.kind === 'room') {
        await deleteAdminRoom(confirmTarget.item.id)
        await refreshRooms()
        setRoomOptions((current) => current.filter((item) => item.id !== confirmTarget.item.id))
        toast.success('Đã xóa phòng.')
      } else {
        await adminRequest(`/admin/amenities/${confirmTarget.item.id}`, { method: 'DELETE' })
        setAmenities((current) => current.filter((item) => item.id !== confirmTarget.item.id))
        toast.success('Đã xóa tiện nghi.')
      }
      setConfirmTarget(null)
    } catch (error) {
      const message = errorText(error, confirmTarget.kind === 'room' ? 'Không thể xóa phòng.' : 'Không thể xóa tiện nghi.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const openAmenity = (amenity?: Amenity) => {
    setAmenityForm(amenity
      ? { id: amenity.id, code: amenity.code, name: amenity.name, icon: amenity.icon ?? '' }
      : { ...emptyAmenityForm })
    setAmenityDialogOpen(true)
  }

  const saveAmenity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAmenitySaving(true)
    try {
      const payload = { code: amenityForm.code.trim(), name: amenityForm.name.trim(), icon: amenityForm.icon.trim() }
      const saved = await adminRequest<Amenity>(
        amenityForm.id ? `/admin/amenities/${amenityForm.id}` : '/admin/amenities',
        { method: amenityForm.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) },
      )
      setAmenities((current) => {
        const next = amenityForm.id ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setAmenityDialogOpen(false)
      toast.success(amenityForm.id ? 'Đã cập nhật tiện nghi.' : 'Đã tạo tiện nghi.')
    } catch (error) {
      const message = errorText(error, 'Không thể lưu tiện nghi.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setAmenitySaving(false)
    }
  }

  const openBookingDetail = async (booking: AdminBooking) => {
    setBookingSaving(true)
    try {
      const detail = await adminRequest<AdminBooking>(`/admin/bookings/${booking.id}`)
      setBookingDetail(detail)
      setBookingStatusDraft(detail.status)
    } catch (error) {
      const message = errorText(error, 'Không thể tải chi tiết booking.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBookingSaving(false)
    }
  }

  const updateBookingState = async () => {
    if (!bookingDetail) return
    setBookingSaving(true)
    try {
      await adminRequest<AdminBooking>(`/admin/bookings/${bookingDetail.id}/status`, jsonBody({ status: bookingStatusDraft }, 'PATCH'))
      await refreshBookings()
      setBookingDetail((current) => current ? { ...current, status: bookingStatusDraft, ...(bookingStatusDraft === 'REFUNDED' ? { paymentStatus: 'REFUNDED' as const } : {}) } : current)
      toast.success('Đã cập nhật trạng thái booking.')
    } catch (error) {
      const message = errorText(error, 'Không thể cập nhật booking.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBookingSaving(false)
    }
  }

  const confirmBookingAction = async () => {
    if (!bookingDetail || !bookingAction) return
    setBookingSaving(true)
    try {
      const action = bookingAction
      await adminRequest(`/admin/bookings/${bookingDetail.id}/${action}`, { method: 'POST' })
      await refreshBookings()
      setBookingDetail((current) => current
        ? { ...current, status: action === 'cancel' ? 'CANCELLED' : 'REFUNDED', ...(action === 'refund' ? { paymentStatus: 'REFUNDED' } : {}) }
        : current)
      setBookingAction(null)
      toast.success(action === 'cancel' ? 'Đã hủy booking.' : 'Đã hoàn tiền booking.')
    } catch (error) {
      const message = errorText(error, 'Không thể thực hiện thao tác booking.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setBookingSaving(false)
    }
  }

  const openCreateUser = () => {
    setUserForm({ ...emptyUserForm })
    setUserDialogOpen(true)
  }

  const openEditUser = async (user: AdminUser) => {
    setUserSaving(true)
    try {
      const detail = await adminRequest<AdminUser>(`/admin/users/${user.id}`)
      setUserForm({ ...emptyUserForm, ...detail, password: '' })
      setUserDialogOpen(true)
    } catch (error) {
      const message = errorText(error, 'Không thể tải thông tin người dùng.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setUserSaving(false)
    }
  }

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUserSaving(true)
    try {
      if (!userForm.id) {
        if (userForm.password.length < 8) {
          toast.error('Mật khẩu phải có ít nhất 8 ký tự.')
          setUserSaving(false)
          return
        }
        await adminRequest<AdminUser>('/admin/users', jsonBody(userForm))
      } else {
        const original = users.find((item) => item.id === userForm.id)
        await adminRequest<AdminUser>(`/admin/users/${userForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ fullName: userForm.fullName, email: userForm.email, phone: userForm.phone }),
        })
        if (original?.role !== userForm.role) {
          await adminRequest<AdminUser>(`/admin/users/${userForm.id}/role`, jsonBody({ role: userForm.role }, 'PATCH'))
        }
        if (original?.status !== userForm.status) {
          await adminRequest<AdminUser>(`/admin/users/${userForm.id}/status`, jsonBody({ status: userForm.status }, 'PATCH'))
        }
      }
      await refreshUsers()
      setUserDialogOpen(false)
      toast.success(userForm.id ? 'Đã cập nhật người dùng.' : 'Đã tạo người dùng.')
    } catch (error) {
      const message = errorText(error, 'Không thể lưu người dùng.')
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setUserSaving(false)
    }
  }

  const selectTab = (tab: AdminTab) => {
    setActiveTab(tab)
    setMobileNavOpen(false)
  }

  const navItems: { tab: AdminTab; title: string; icon: ReactNode }[] = [
    { tab: 'overview', title: 'Tổng quan', icon: <BarChartIcon /> },
    { tab: 'rooms', title: 'Phòng & tiện nghi', icon: <HotelIcon /> },
    { tab: 'bookings', title: 'Booking', icon: <CalendarMonthIcon /> },
    { tab: 'users', title: 'Người dùng', icon: <GroupIcon /> },
  ]
  const activeTabTitle = navItems.find((item) => item.tab === activeTab)?.title ?? 'Tổng quan'

  const drawer = (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      color: '#FFFFFF',
      background: 'linear-gradient(180deg, #2A1D31 0%, #4A3152 48%, #5B6F64 100%)',
    }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 3 }}>
        <Avatar src={logoImg} alt="O Ni Homestay" variant="rounded" sx={{ bgcolor: '#FFFFFF', width: 48, height: 48, boxShadow: '0 12px 24px rgba(0,0,0,0.16)' }} />
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>O Ni Homestay</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)' }}>Không gian quản trị</Typography>
        </Box>
      </Stack>
      <Box sx={{ px: 3, pb: 2 }}>
        <Paper sx={{ p: 2, borderRadius: '22px', bgcolor: 'rgba(255,255,255,0.12)', color: '#FFFFFF', backdropFilter: 'blur(14px)' }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>Bảng điều hành</Typography>
          <Typography variant="h6" sx={{ mt: 0.75 }}>Modern admin surface</Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'rgba(255,255,255,0.74)' }}>
            Ưu tiên thống kê ngắn gọn, chart rõ và danh sách gọn theo kích thước màn hình.
          </Typography>
        </Paper>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.14)' }} />
      <Box component="nav" aria-label="Admin navigation" sx={{ p: 2 }}>
        <Stack spacing={0.75}>
          {navItems.map(({ tab, title, icon }) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'contained' : 'text'}
              color={activeTab === tab ? 'primary' : 'inherit'}
              startIcon={icon}
              onClick={() => selectTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              sx={{
                justifyContent: 'flex-start',
                py: 1.4,
                px: 2,
                borderRadius: '16px',
                color: activeTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.76)',
                bgcolor: activeTab === tab ? 'rgba(255,255,255,0.16)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              {title}
            </Button>
          ))}
        </Stack>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2 }}>
        <Button fullWidth startIcon={<LogoutIcon />} color="inherit" onClick={onAdminLogout}
          sx={{ color: 'rgba(255,255,255,0.78)', justifyContent: 'flex-start', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
          Đăng xuất
        </Button>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          display: { md: 'none' },
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'rgba(255,253,249,0.92)',
          backdropFilter: 'blur(14px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton edge="start" aria-label="Mở menu quản trị" onClick={() => setMobileNavOpen(true)} sx={{ mr: 1 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>O Ni Admin</Typography>
        </Toolbar>
      </AppBar>
      <Box component="nav" aria-label="Admin navigation">
        <Drawer
          variant="temporary"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0 } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: 'none', md: 'block' }, width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', border: 0, boxShadow: '18px 0 48px rgba(47, 36, 31, 0.08)' } }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ width: '100%', minWidth: 0, px: { xs: 2, sm: 3 }, py: { xs: 2, md: 3 }, mt: { xs: 8, md: 0 }, bgcolor: 'background.default',
        '& .MuiTableCell-root': { whiteSpace: 'nowrap', py: 1 },
        '& .MuiTableHead-root': { bgcolor: '#F8F0F6' },
      }}>
        <Paper sx={{ p: { xs: 2.25, md: 3 }, borderRadius: '28px', mb: 3, bgcolor: 'rgba(255,253,249,0.9)', boxShadow: '0 22px 60px rgba(47, 36, 31, 0.08)' }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.5} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="primary">O Ni · Quản trị vận hành</Typography>
              <Typography variant="h4" sx={{ mt: 0.75 }}>Dashboard hiện đại hơn, sạch hơn và đọc số liệu nhanh hơn.</Typography>
              <Typography color="text.secondary" sx={{ mt: 1.25, maxWidth: 760 }}>
                {activeTabTitle} đang dùng surface mới với chart MUI custom, khối thống kê rõ hơn và giới hạn dòng/trang tự thích ứng theo kích thước màn hình.
              </Typography>
            </Box>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} alignItems="flex-start">
              <Badge variant="secondary">Bảng điều hành</Badge>
              {summary && <Badge variant="primary">{summary.activeRooms} phòng active</Badge>}
              {summary && <Badge variant="success">{summary.confirmedBookings} booking confirmed</Badge>}
            </Stack>
          </Stack>
        </Paper>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMessage('')}>
            {errorMessage}
          </Alert>
        )}
        {activeTab === 'overview' && (
          <Overview
            summary={summary}
            revenue={revenue}
            topRooms={topRooms}
            rooms={roomOptions}
            dateRange={dateRange}
            setDateRange={setDateRange}
            loading={overviewLoading}
          />
        )}
        {activeTab === 'rooms' && (
          <RoomsTab
            rooms={rooms}
            amenities={amenities}
            search={roomSearch}
            setSearch={setRoomSearch}
            status={roomStatus}
            setStatus={setRoomStatus}
            loading={roomsLoading}
            loadingMore={roomsLoadingMore}
            hasMore={roomsHasMore}
            sentinelRef={roomListSentinelRef}
            amenitiesLoading={amenitiesLoading}
            onCreateRoom={openCreateRoom}
            onEditRoom={openEditRoom}
            onDeleteRoom={removeRoom}
            onCreateAmenity={() => openAmenity()}
            onEditAmenity={openAmenity}
            onDeleteAmenity={removeAmenity}
          />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            rooms={roomOptions}
            loading={bookingsLoading}
            loadingMore={bookingsLoadingMore}
            hasMore={bookingsHasMore}
            sentinelRef={bookingListSentinelRef}
            keyword={bookingKeyword}
            setKeyword={setBookingKeyword}
            roomId={bookingRoomId}
            setRoomId={setBookingRoomId}
            status={bookingStatus}
            setStatus={setBookingStatus}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            checkInFrom={checkInFrom}
            setCheckInFrom={setCheckInFrom}
            checkInTo={checkInTo}
            setCheckInTo={setCheckInTo}
            onView={openBookingDetail}
            busy={bookingSaving}
          />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            loadingMore={usersLoadingMore}
            hasMore={usersHasMore}
            sentinelRef={userListSentinelRef}
            keyword={userKeyword}
            setKeyword={setUserKeyword}
            role={userRole}
            setRole={setUserRole}
            status={userStatus}
            setStatus={setUserStatus}
            onCreate={openCreateUser}
            onEdit={openEditUser}
            busy={userSaving}
          />
        )}
      </Box>

      <Dialog open={roomDialogOpen} onClose={() => !roomSaving && setRoomDialogOpen(false)} fullWidth maxWidth="lg" aria-labelledby="room-dialog-title">
        <Box component="form" onSubmit={saveRoom}>
          <DialogTitle id="room-dialog-title">{roomForm.id ? 'Chỉnh sửa phòng' : 'Tạo phòng'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Stack spacing={2}>
                <TextField required label="Tên phòng" value={roomForm.name} onChange={(event) => setRoomField('name', event.target.value)} />
                <TextField required label="Slug" value={roomForm.slug} onChange={(event) => setRoomField('slug', event.target.value)} />
                <TextField required label="Loại phòng" value={roomForm.roomType} onChange={(event) => setRoomField('roomType', event.target.value)} />
                <FormControl fullWidth>
                  <InputLabel id="room-status-label">Trạng thái</InputLabel>
                  <Select labelId="room-status-label" label="Trạng thái" value={roomForm.status} onChange={(event) => setRoomField('status', event.target.value as RoomStatus)}>
                    {(['ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const).map((item) => <MenuItem key={item} value={item}>{formatAdminStatus(item)}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField label="Mật khẩu phòng" type="text" autoComplete="off" value={roomForm.password} onChange={(event) => setRoomField('password', event.target.value)} helperText="Mã khóa cửa được giữ trong dữ liệu phòng." />
                <TextField required label="Mô tả ngắn" value={roomForm.shortDescription} onChange={(event) => setRoomField('shortDescription', event.target.value)} />
                <TextField required multiline minRows={4} label="Mô tả chi tiết" value={roomForm.description} onChange={(event) => setRoomField('description', event.target.value)} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1.5 }}>
                  <TextField required type="number" label="Giá / đêm (VNĐ)" inputProps={{ min: 0, step: 1 }} value={roomForm.pricePerNight} onChange={(event) => setRoomField('pricePerNight', event.target.value)} />
                  <TextField required type="number" label="Khách tối đa" inputProps={{ min: 1, step: 1 }} value={roomForm.maxGuests} onChange={(event) => setRoomField('maxGuests', event.target.value)} />
                  <TextField required type="number" label="Thứ tự nổi bật" inputProps={{ min: 0, step: 1 }} value={roomForm.featuredOrder} onChange={(event) => setRoomField('featuredOrder', event.target.value)} />
                  <TextField required type="number" label="Phòng ngủ" inputProps={{ min: 1, step: 1 }} value={roomForm.bedroomCount} onChange={(event) => setRoomField('bedroomCount', event.target.value)} />
                  <TextField required type="number" label="Giường" inputProps={{ min: 1, step: 1 }} value={roomForm.bedCount} onChange={(event) => setRoomField('bedCount', event.target.value)} />
                  <TextField required type="number" label="Phòng tắm" inputProps={{ min: 1, step: 1 }} value={roomForm.bathroomCount} onChange={(event) => setRoomField('bathroomCount', event.target.value)} />
                  <TextField required type="number" label="Diện tích (m²)" inputProps={{ min: 1, step: 1 }} value={roomForm.sizeSqm} onChange={(event) => setRoomField('sizeSqm', event.target.value)} />
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    fullWidth
                    label="Thêm tiện nghi"
                    value={roomForm.amenityDraft}
                    onChange={(event) => setRoomField('amenityDraft', event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        addAmenityToRoom()
                      }
                    }}
                  />
                  <Button type="button" variant="outlined" startIcon={<AddIcon />} onClick={addAmenityToRoom}>Thêm</Button>
                </Stack>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" aria-label="Tiện nghi đã chọn">
                  {roomForm.amenities.map((name) => (
                    <Chip key={name} label={name} onDelete={() => setRoomField('amenities', roomForm.amenities.filter((item) => item !== name))} />
                  ))}
                </Stack>
              </Stack>
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                    <Box>
                      <Typography variant="h6">Ảnh phòng</Typography>
                      <Typography variant="body2" color="text.secondary">Tải ảnh lên, chọn cover và sắp xếp thứ tự trước khi lưu phòng.</Typography>
                    </Box>
                    <Button component="label" variant="contained" startIcon={<PhotoLibraryIcon />} disabled={imagesUploading}>
                      {imagesUploading ? 'Đang tải…' : 'Chọn ảnh'}
                      <input hidden type="file" accept="image/*" multiple onChange={handleImageUpload} />
                    </Button>
                  </Stack>
                  {roomForm.images.length === 0 ? (
                    <EmptyState text="Chưa có ảnh phòng." />
                  ) : (
                    <Stack spacing={1.5} sx={{ mt: 2 }}>
                      {roomForm.images.map((image, index) => (
                        <Paper key={image.id || image.s3Key} variant="outlined" sx={{ p: 1.25, display: 'grid', gridTemplateColumns: { xs: '76px 1fr', sm: '96px 1fr' }, gap: 1.5, alignItems: 'center' }}>
                          <Box component="img" src={image.url} alt={image.altText || image.name} sx={{ width: '100%', height: 76, objectFit: 'cover', borderRadius: '8px' }} />
                          <Stack spacing={0.75} minWidth={0}>
                            <Typography variant="body2" fontWeight={600} noWrap>{image.name || image.altText || 'Ảnh phòng'}</Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>{image.s3Key}</Typography>
                            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                              <FormControlLabel
                                control={<Switch size="small" checked={image.isCover} onChange={() => setRoomField('images', roomForm.images.map((item) => ({ ...item, isCover: item.id === image.id && item.s3Key === image.s3Key })))} />}
                                label="Cover"
                              />
                              <IconButton aria-label={`Đưa ảnh ${index + 1} lên trước`} size="small" disabled={index === 0} onClick={() => setRoomField('images', moveImage(roomForm.images, index, -1))}><ArrowUpwardIcon fontSize="small" /></IconButton>
                              <IconButton aria-label={`Đưa ảnh ${index + 1} xuống sau`} size="small" disabled={index === roomForm.images.length - 1} onClick={() => setRoomField('images', moveImage(roomForm.images, index, 1))}><ArrowDownwardIcon fontSize="small" /></IconButton>
                              <IconButton aria-label={`Xóa ảnh ${image.name}`} color="error" size="small" onClick={() => {
                                const remaining = roomForm.images.filter((_, imageIndex) => imageIndex !== index).map((item, order) => ({ ...item, sortOrder: order + 1 }))
                                if (image.isCover && remaining.length) remaining[0] = { ...remaining[0], isCover: true }
                                setRoomField('images', remaining)
                              }}><DeleteOutlineIcon fontSize="small" /></IconButton>
                            </Stack>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Paper>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6">Xem trước</Typography>
                  {roomForm.images.find((image) => image.isCover)?.url
                    ? <Box component="img" src={roomForm.images.find((image) => image.isCover)?.url} alt={roomForm.name || 'Ảnh cover'} sx={{ width: '100%', height: 190, objectFit: 'cover', borderRadius: '8px', mt: 1 }} />
                    : <EmptyState text="Chọn ảnh cover để xem trước." />}
                  <Typography variant="h6" sx={{ mt: 1 }}>{roomForm.name || 'Tên phòng'}</Typography>
                  <Typography variant="body2" color="text.secondary">{roomForm.shortDescription || 'Mô tả ngắn'}</Typography>
                </Paper>
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setRoomDialogOpen(false)} disabled={roomSaving}>Hủy</Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={roomSaving || imagesUploading}>
              {roomSaving ? 'Đang lưu…' : 'Lưu phòng'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={amenityDialogOpen} onClose={() => !amenitySaving && setAmenityDialogOpen(false)} fullWidth maxWidth="sm" aria-labelledby="amenity-dialog-title">
        <Box component="form" onSubmit={saveAmenity}>
          <DialogTitle id="amenity-dialog-title">{amenityForm.id ? 'Sửa tiện nghi' : 'Tạo tiện nghi'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="Mã tiện nghi" value={amenityForm.code} onChange={(event) => setAmenityForm((current) => ({ ...current, code: event.target.value }))} />
              <TextField required label="Tên tiện nghi" value={amenityForm.name} onChange={(event) => setAmenityForm((current) => ({ ...current, name: event.target.value }))} />
              <TextField label="Icon" value={amenityForm.icon} onChange={(event) => setAmenityForm((current) => ({ ...current, icon: event.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setAmenityDialogOpen(false)} disabled={amenitySaving}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={amenitySaving}>Lưu tiện nghi</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={userDialogOpen} onClose={() => !userSaving && setUserDialogOpen(false)} fullWidth maxWidth="sm" aria-labelledby="user-dialog-title">
        <Box component="form" onSubmit={saveUser}>
          <DialogTitle id="user-dialog-title">{userForm.id ? 'Cập nhật người dùng' : 'Tạo người dùng'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="Họ và tên" value={userForm.fullName} onChange={(event) => setUserForm((current) => ({ ...current, fullName: event.target.value }))} />
              <TextField required type="email" label="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
              <TextField required label="Số điện thoại" value={userForm.phone} onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))} />
              {!userForm.id && <TextField required type="password" label="Mật khẩu" autoComplete="new-password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} helperText="Ít nhất 8 ký tự." />}
              <FormControl fullWidth>
                <InputLabel id="user-role-label">Vai trò</InputLabel>
                <Select labelId="user-role-label" label="Vai trò" value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as UserRole }))}>
                  {(['CUSTOMER', 'STAFF', 'ADMIN'] as const).map((role) => <MenuItem key={role} value={role}>{formatAdminStatus(role)}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="user-status-label">Trạng thái</InputLabel>
                <Select labelId="user-status-label" label="Trạng thái" value={userForm.status} onChange={(event) => setUserForm((current) => ({ ...current, status: event.target.value as UserStatus }))}>
                  {(['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'] as const).map((status) => <MenuItem key={status} value={status}>{formatAdminStatus(status)}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setUserDialogOpen(false)} disabled={userSaving}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={userSaving}>{userSaving ? 'Đang lưu…' : 'Lưu người dùng'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(bookingDetail)} onClose={() => setBookingDetail(null)} fullWidth maxWidth="sm" aria-labelledby="booking-detail-title">
        {bookingDetail && (
          <>
            <DialogTitle id="booking-detail-title">Booking {bookingDetail.bookingCode}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <DetailLine label="Khách" value={bookingDetail.guestName} />
                <DetailLine label="Email" value={bookingDetail.guestEmail || '—'} />
                <DetailLine label="Phòng" value={bookingDetail.roomName} />
                <DetailLine label="Lưu trú" value={`${bookingDetail.checkInDate} → ${bookingDetail.checkOutDate}`} />
                <DetailLine label="Tổng tiền" value={formatCurrency(bookingDetail.totalAmount)} />
                <DetailLine label="Nguồn booking" value={formatBookingSource(bookingDetail.bookingSource)} />
                <DetailLine label="Thanh toán" value={formatAdminStatus(bookingDetail.paymentStatus)} />
                <DetailLine label="Tạo lúc" value={bookingDetail.createdAt} />
                <FormControl fullWidth>
                  <InputLabel id="booking-detail-status-label">Trạng thái booking</InputLabel>
                  <Select labelId="booking-detail-status-label" label="Trạng thái booking" value={bookingStatusDraft} onChange={(event) => setBookingStatusDraft(event.target.value as BookingStatus)}>
                    {bookingStatuses.map((status) => <MenuItem key={status} value={status}>{formatAdminStatus(status)}</MenuItem>)}
                  </Select>
                  <FormHelperText>Lưu trạng thái trực tiếp lên booking.</FormHelperText>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2, flexWrap: 'wrap' }}>
              <Button color="error" onClick={() => setBookingAction('cancel')} disabled={bookingSaving || bookingDetail.status === 'CANCELLED'}>Hủy booking</Button>
              <Button color="warning" onClick={() => setBookingAction('refund')} disabled={bookingSaving || bookingDetail.paymentStatus === 'REFUNDED'}>Hoàn tiền</Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button onClick={() => setBookingDetail(null)}>Đóng</Button>
              <Button variant="contained" onClick={updateBookingState} disabled={bookingSaving || bookingStatusDraft === bookingDetail.status}>
                Lưu trạng thái
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(bookingAction)} onClose={() => !bookingSaving && setBookingAction(null)} aria-labelledby="booking-action-title">
        <DialogTitle id="booking-action-title">{bookingAction === 'cancel' ? 'Xác nhận hủy booking' : 'Xác nhận hoàn tiền'}</DialogTitle>
        <DialogContent>
          <Typography>
            {bookingAction === 'cancel'
              ? `Bạn có chắc muốn hủy booking ${bookingDetail?.bookingCode}?`
              : `Bạn có chắc muốn hoàn tiền booking ${bookingDetail?.bookingCode}?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBookingAction(null)} disabled={bookingSaving}>Quay lại</Button>
          <Button color="error" variant="contained" onClick={confirmBookingAction} disabled={bookingSaving}>
            {bookingSaving ? 'Đang xử lý…' : 'Xác nhận'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmTarget)} onClose={() => !deleting && setConfirmTarget(null)} aria-labelledby="delete-confirm-title">
        <DialogTitle id="delete-confirm-title">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <Typography>
            {confirmTarget?.kind === 'room'
              ? `Xóa phòng “${confirmTarget.item.name}”? Tất cả ảnh của phòng cũng sẽ bị xóa.`
              : `Xóa tiện nghi “${confirmTarget?.item.name}”?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)} disabled={deleting}>Hủy</Button>
          <Button color="error" variant="contained" onClick={confirmDeletion} disabled={deleting}>
            {deleting ? 'Đang xóa…' : 'Xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function Overview({
  summary,
  revenue,
  topRooms,
  rooms,
  dateRange,
  setDateRange,
  loading,
}: {
  summary: Summary | null
  revenue: RevenuePoint[]
  topRooms: { roomName: string; revenue: number }[]
  rooms: AdminRoom[]
  dateRange: '30d' | '90d' | '180d'
  setDateRange: (value: '30d' | '90d' | '180d') => void
  loading: boolean
}) {
  const [view, setView] = useState('revenue')
  const narrowViewport = useMediaQuery('(max-width: 599px)')
  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Typography variant="h5" fontWeight={700}>Tổng quan doanh thu & công suất</Typography>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="analytics-range-label">Khoảng thời gian</InputLabel>
          <Select labelId="analytics-range-label" label="Khoảng thời gian" value={dateRange} onChange={(event) => setDateRange(event.target.value as '30d' | '90d' | '180d')}>
            <MenuItem value="30d">30 ngày</MenuItem><MenuItem value="90d">90 ngày</MenuItem><MenuItem value="180d">180 ngày</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      {loading && <LoadingState />}
      {!loading && summary && (
        <>
          {(!narrowViewport || view === 'metrics') && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', xl: 'repeat(4,1fr)' }, gap: 1.5 }}>
            <StatCard label="Tổng doanh thu đã thu" value={formatCurrency(summary.totalRevenue)} tone="primary" helper="Tổng giá trị booking đã ghi nhận." />
            <StatCard label="Đặt phòng đã xác nhận" value={String(summary.confirmedBookings)} tone="secondary" helper="Booking hoàn tất bước thanh toán hoặc xác nhận." />
            <StatCard label="Công suất phòng trung bình" value={`${summary.averageOccupancyRate}%`} tone="success" helper="Giữ đúng tỷ lệ occupancy từ API analytics." />
            <StatCard label="Phòng đang mở bán" value={String(summary.activeRooms)} tone="warning" helper="Số phòng active đang hiện trên public site." />
          </Box>}
          <Paper sx={{ p: 0.75, borderRadius: '20px', bgcolor: 'rgba(255,253,249,0.92)' }}>
          <Tabs value={view} onChange={(_, next: string) => setView(next)} variant="scrollable" aria-label="Dữ liệu tổng quan">
            {narrowViewport && <Tab value="metrics" label="Chỉ số" />}
            <Tab value="revenue" label="Doanh thu" />
            <Tab value="top" label="Theo phòng" />
            <Tab value="rooms" label="Tình hình phòng" />
          </Tabs>
          </Paper>
          <Box sx={{ minWidth: 0 }}>
            {view === 'revenue' && <Paper variant="outlined" sx={{ p: 2.5, minWidth: 0, borderRadius: '24px', bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight={700}>Doanh thu theo thời gian</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Xu hướng doanh thu trong kỳ đã chọn, giữ đúng giá trị revenue từ API.</Typography>
              {revenue.length ? (
                <LineChart
                  xAxis={[{ data: revenue.map((point) => point.month), scaleType: 'point' }]}
                  yAxis={[{ valueFormatter: (value: number) => `${Math.round(value / 1_000_000)}M` }]}
                  series={[{
                    data: revenue.map((point) => point.revenue),
                    label: 'Doanh thu',
                    color: '#73507C',
                    area: true,
                    showMark: true,
                    valueFormatter: (value) => formatCurrency(value ?? 0),
                  }]}
                  height={narrowViewport ? 200 : 260}
                  margin={{ left: 12, right: 24, top: 28, bottom: 36 }}
                  grid={{ horizontal: true }}
                  hideLegend
                  sx={{
                    mt: 1.5,
                    '& .MuiChartsAxis-tickLabel': { fill: '#786A63' },
                    '& .MuiChartsGrid-line': { stroke: '#E8DDD1' },
                    '& .MuiAreaElement-root': { fill: 'url(#oni-revenue-gradient)' },
                    '& .MuiLineElement-root': { strokeWidth: 3 },
                    '& .MuiMarkElement-root': { fill: '#FFFDF9', stroke: '#73507C', strokeWidth: 2 },
                  }}
                />
              ) : <EmptyState text="Chưa có dữ liệu doanh thu trong khoảng thời gian đã chọn." />}
              <Box component="svg" sx={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="oni-revenue-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(115,80,124,0.30)" />
                    <stop offset="100%" stopColor="rgba(115,80,124,0.02)" />
                  </linearGradient>
                </defs>
              </Box>
            </Paper>}
            {view === 'top' && <Paper variant="outlined" sx={{ p: 2.5, minWidth: 0, borderRadius: '24px', bgcolor: 'background.paper' }}>
              <Typography variant="h6" fontWeight={700}>Doanh thu theo phòng</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Các phòng có doanh thu cao nhất</Typography>
              {topRooms.length ? (
                <BarChart
                  layout="horizontal"
                  yAxis={[{ scaleType: 'band', data: topRooms.map((room) => room.roomName), width: 112 }]}
                  series={[{
                    data: topRooms.map((room) => room.revenue),
                    color: '#728B7A',
                    label: 'Doanh thu',
                    valueFormatter: (value) => formatCurrency(value ?? 0),
                  }]}
                  height={Math.max(220, topRooms.length * 56)}
                  margin={{ left: 12, right: 20, top: 28, bottom: 28 }}
                  grid={{ vertical: true }}
                  hideLegend
                  borderRadius={14}
                  sx={{
                    mt: 1.5,
                    '& .MuiChartsAxis-tickLabel': { fill: '#786A63' },
                    '& .MuiChartsGrid-line': { stroke: '#E8DDD1' },
                  }}
                />
              ) : <EmptyState text="Chưa có dữ liệu doanh thu theo phòng." />}
            </Paper>}
          </Box>
          {view === 'rooms' && <Paper variant="outlined" sx={{ borderRadius: '24px', overflow: 'hidden' }}>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>Tình hình phòng hiện tại</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Danh sách phòng active/maintenance/inactive hiển thị liền mạch, không chia trang.</Typography>
            </Box>
            <TableContainer role="region" aria-label="Bảng tình hình phòng" tabIndex={0} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead><TableRow><TableCell>Phòng</TableCell><TableCell>Giá / đêm</TableCell><TableCell>Công suất</TableCell><TableCell>Trạng thái</TableCell><TableCell>Ảnh</TableCell><TableCell>Cập nhật</TableCell></TableRow></TableHead>
                <TableBody>{rooms.map((room) => (
                  <TableRow key={room.id} hover>
                    <TableCell>{room.name}</TableCell><TableCell>{formatCurrency(room.pricePerNight)}</TableCell><TableCell>{room.occupancyRate}%</TableCell>
                    <TableCell><StatusChip value={room.status} /></TableCell><TableCell>{room.images?.length ?? 0}</TableCell><TableCell>{room.updatedAt}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </TableContainer>
            {!rooms.length && <EmptyState text="Chưa có phòng để hiển thị." />}
          </Paper>}
        </>
      )}
      {!loading && !summary && <EmptyState text="Không có dữ liệu tổng quan." />}
    </Stack>
  )
}

function RoomsTab({
  rooms, amenities, search, setSearch, status, setStatus, loading, loadingMore, hasMore, sentinelRef, amenitiesLoading,
  onCreateRoom, onEditRoom, onDeleteRoom, onCreateAmenity, onEditAmenity, onDeleteAmenity,
}: {
  rooms: AdminRoom[]
  amenities: Amenity[]
  search: string
  setSearch: (value: string) => void
  status: 'ALL' | RoomStatus
  setStatus: (value: 'ALL' | RoomStatus) => void
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: RefObject<HTMLDivElement | null>
  amenitiesLoading: boolean
  onCreateRoom: () => void
  onEditRoom: (room: AdminRoom) => void
  onDeleteRoom: (room: AdminRoom) => void
  onCreateAmenity: () => void
  onEditAmenity: (amenity: Amenity) => void
  onDeleteAmenity: (amenity: Amenity) => void
}) {
  const [section, setSection] = useState('rooms')
  return (
    <Stack spacing={2.5}>
      <Tabs value={section} onChange={(_, next: string) => setSection(next)} aria-label="Quản lý phòng và tiện nghi">
        <Tab value="rooms" label="Quản lý phòng" />
        <Tab value="amenities" label="Quản lý tiện nghi" />
      </Tabs>
      {section === 'rooms' && <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Typography variant="h5" fontWeight={700}>Quản lý phòng</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateRoom}>Tạo phòng mới</Button>
      </Stack>
      <FilterPanel>
        <TextField label="Tìm phòng" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên, slug hoặc loại phòng" />
        <FormControl fullWidth>
          <InputLabel id="room-filter-label">Trạng thái</InputLabel>
          <Select labelId="room-filter-label" label="Trạng thái" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | RoomStatus)}>
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem><MenuItem value="ACTIVE">{formatAdminStatus('ACTIVE')}</MenuItem><MenuItem value="MAINTENANCE">{formatAdminStatus('MAINTENANCE')}</MenuItem><MenuItem value="INACTIVE">{formatAdminStatus('INACTIVE')}</MenuItem>
          </Select>
        </FormControl>
      </FilterPanel>
      {loading ? <LoadingState /> : rooms.length === 0 ? <EmptyState text="Không có phòng phù hợp với bộ lọc." /> : (
        <TableContainer component={Paper} variant="outlined" role="region" aria-label="Danh sách phòng" tabIndex={0} sx={{ overflowX: 'auto', borderRadius: '24px' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead><TableRow><TableCell>Phòng</TableCell><TableCell>Giá / đêm</TableCell><TableCell>Khách</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
            <TableBody>{rooms.map((room) => <TableRow key={room.id} hover>
              <TableCell><Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar variant="rounded" src={room.coverImage} alt={room.name} sx={{ width: 44, height: 44 }}><HotelIcon /></Avatar>
                <Box><Typography variant="body2" fontWeight={700}>{room.name}</Typography><Typography variant="caption" color="text.secondary">{room.roomType.toLowerCase()} · {room.slug}</Typography></Box>
              </Stack></TableCell>
              <TableCell>{formatCurrency(room.pricePerNight)}</TableCell>
              <TableCell>{room.maxGuests} khách</TableCell>
              <TableCell><StatusChip value={room.status} /></TableCell>
              <TableCell align="right"><Button startIcon={<EditOutlinedIcon />} onClick={() => onEditRoom(room)}>Sửa</Button><Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => onDeleteRoom(room)}>Xóa</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      )}
      {!loading && rooms.length > 0 && (
        <Stack spacing={1} alignItems="center">
          <Box ref={sentinelRef} sx={{ width: '100%', height: 1 }} />
          {loadingMore ? <Typography variant="caption" color="text.secondary">Đang tải thêm phòng...</Typography> : hasMore ? <Typography variant="caption" color="text.secondary">Cuộn xuống để tải thêm phòng.</Typography> : <Typography variant="caption" color="text.secondary">Đã hiển thị toàn bộ phòng phù hợp.</Typography>}
        </Stack>
      )}
      </>}
      {section === 'amenities' && <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box><Typography variant="h5" fontWeight={700}>Quản lý tiện nghi</Typography><Typography variant="body2" color="text.secondary">Các tiện nghi có thể gắn vào phòng.</Typography></Box>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={onCreateAmenity}>Tạo tiện nghi</Button>
      </Stack>
      {amenitiesLoading ? <LoadingState /> : amenities.length === 0 ? <EmptyState text="Chưa có tiện nghi." /> : (
        <TableContainer component={Paper} role="region" aria-label="Bảng tiện nghi" tabIndex={0} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto', borderRadius: '24px' }}>
          <Table size="small" sx={{ minWidth: 500 }}>
            <TableHead><TableRow><TableCell>Mã</TableCell><TableCell>Tên</TableCell><TableCell>Icon</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
            <TableBody>{amenities.map((amenity) => <TableRow key={amenity.id} hover>
              <TableCell>{amenity.code}</TableCell><TableCell>{amenity.name}</TableCell><TableCell>{amenity.icon || '—'}</TableCell>
              <TableCell align="right"><IconButton aria-label={`Sửa ${amenity.name}`} onClick={() => onEditAmenity(amenity)}><EditOutlinedIcon /></IconButton><IconButton aria-label={`Xóa ${amenity.name}`} color="error" onClick={() => onDeleteAmenity(amenity)}><DeleteOutlineIcon /></IconButton></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer>
      )}
      </>}
    </Stack>
  )
}

function BookingsTab({
  bookings, rooms, loading, loadingMore, hasMore, sentinelRef, keyword, setKeyword, roomId, setRoomId, status, setStatus, paymentStatus, setPaymentStatus,
  checkInFrom, setCheckInFrom, checkInTo, setCheckInTo, onView, busy,
}: {
  bookings: AdminBooking[]
  rooms: AdminRoom[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: RefObject<HTMLDivElement | null>
  keyword: string
  setKeyword: (value: string) => void
  roomId: string
  setRoomId: (value: string) => void
  status: 'ALL' | BookingStatus
  setStatus: (value: 'ALL' | BookingStatus) => void
  paymentStatus: 'ALL' | PaymentStatus
  setPaymentStatus: (value: 'ALL' | PaymentStatus) => void
  checkInFrom: string
  setCheckInFrom: (value: string) => void
  checkInTo: string
  setCheckInTo: (value: string) => void
  onView: (booking: AdminBooking) => void
  busy: boolean
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h5" fontWeight={700}>Quản lý booking</Typography>
      <FilterPanel>
        <TextField label="Tìm booking" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã booking, tên hoặc email khách" />
        <FormControl fullWidth><InputLabel id="booking-room-label">Phòng</InputLabel><Select labelId="booking-room-label" label="Phòng" value={roomId} onChange={(event) => setRoomId(event.target.value)}><MenuItem value="ALL">Tất cả phòng</MenuItem>{rooms.map((room) => <MenuItem key={room.id} value={room.id}>{room.name}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel id="booking-status-label">Trạng thái</InputLabel><Select labelId="booking-status-label" label="Trạng thái" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | BookingStatus)}><MenuItem value="ALL">Tất cả trạng thái</MenuItem>{bookingStatuses.map((value) => <MenuItem key={value} value={value}>{formatAdminStatus(value)}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel id="payment-status-label">Thanh toán</InputLabel><Select labelId="payment-status-label" label="Thanh toán" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as 'ALL' | PaymentStatus)}><MenuItem value="ALL">Tất cả thanh toán</MenuItem>{(['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'] as const).map((value) => <MenuItem key={value} value={value}>{formatAdminStatus(value)}</MenuItem>)}</Select></FormControl>
        <TextField type="date" label="Nhận phòng từ" InputLabelProps={{ shrink: true }} value={checkInFrom} onChange={(event) => setCheckInFrom(event.target.value)} />
        <TextField type="date" label="Nhận phòng đến" InputLabelProps={{ shrink: true }} value={checkInTo} onChange={(event) => setCheckInTo(event.target.value)} />
      </FilterPanel>
      <Paper variant="outlined" sx={{ borderRadius: '24px', overflow: 'hidden' }}>
        <TableContainer role="region" aria-label="Bảng booking" tabIndex={0} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 920 }}>
            <TableHead><TableRow><TableCell>Mã</TableCell><TableCell>Khách</TableCell><TableCell>Phòng</TableCell><TableCell>Lưu trú</TableCell><TableCell>Tổng tiền</TableCell><TableCell>Nguồn</TableCell><TableCell>Trạng thái</TableCell><TableCell align="right">Chi tiết</TableCell></TableRow></TableHead>
            <TableBody>{bookings.map((booking) => (
              <TableRow key={booking.id} hover>
                <TableCell>{booking.bookingCode}</TableCell>
                <TableCell>{booking.guestName}<Typography variant="caption" display="block" color="text.secondary">{booking.guestEmail}</Typography></TableCell>
                <TableCell>{booking.roomName}</TableCell><TableCell>{booking.checkInDate} → {booking.checkOutDate}</TableCell>
                <TableCell>{formatCurrency(booking.totalAmount)}</TableCell><TableCell>{formatBookingSource(booking.bookingSource)}</TableCell>
                <TableCell><Stack spacing={0.5} alignItems="flex-start"><StatusChip value={booking.status} /><StatusChip value={booking.paymentStatus} /></Stack></TableCell>
                <TableCell align="right"><IconButton aria-label={`Chi tiết booking ${booking.bookingCode}`} onClick={() => onView(booking)} disabled={busy}><VisibilityOutlinedIcon /></IconButton></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TableContainer>
        {loading ? <LoadingState /> : !bookings.length ? <EmptyState text="Không tìm thấy booking với bộ lọc hiện tại." /> : (
          <Stack spacing={1} alignItems="center" sx={{ p: 2 }}>
            <Box ref={sentinelRef} sx={{ width: '100%', height: 1 }} />
            {loadingMore ? <Typography variant="caption" color="text.secondary">Đang tải thêm booking...</Typography> : hasMore ? <Typography variant="caption" color="text.secondary">Cuộn xuống để tải thêm booking.</Typography> : <Typography variant="caption" color="text.secondary">Đã hiển thị toàn bộ booking phù hợp.</Typography>}
          </Stack>
        )}
      </Paper>
    </Stack>
  )
}

function UsersTab({
  users, loading, loadingMore, hasMore, sentinelRef, keyword, setKeyword, role, setRole, status, setStatus, onCreate, onEdit, busy,
}: {
  users: AdminUser[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  sentinelRef: RefObject<HTMLDivElement | null>
  keyword: string
  setKeyword: (value: string) => void
  role: 'ALL' | UserRole
  setRole: (value: 'ALL' | UserRole) => void
  status: 'ALL' | UserStatus
  setStatus: (value: 'ALL' | UserStatus) => void
  onCreate: () => void
  onEdit: (user: AdminUser) => void
  busy: boolean
}) {
  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box><Typography variant="h5" fontWeight={700}>Quản lý người dùng</Typography><Typography variant="body2" color="text.secondary">Cập nhật thông tin, vai trò và trạng thái tài khoản.</Typography></Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>Tạo người dùng</Button>
      </Stack>
      <FilterPanel>
        <TextField label="Tìm người dùng" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên, email hoặc điện thoại" />
        <FormControl fullWidth><InputLabel id="user-role-filter-label">Vai trò</InputLabel><Select labelId="user-role-filter-label" label="Vai trò" value={role} onChange={(event) => setRole(event.target.value as 'ALL' | UserRole)}><MenuItem value="ALL">Tất cả vai trò</MenuItem>{(['CUSTOMER', 'STAFF', 'ADMIN'] as const).map((value) => <MenuItem key={value} value={value}>{formatAdminStatus(value)}</MenuItem>)}</Select></FormControl>
        <FormControl fullWidth><InputLabel id="user-status-filter-label">Trạng thái</InputLabel><Select labelId="user-status-filter-label" label="Trạng thái" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | UserStatus)}><MenuItem value="ALL">Tất cả trạng thái</MenuItem>{(['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'] as const).map((value) => <MenuItem key={value} value={value}>{formatAdminStatus(value)}</MenuItem>)}</Select></FormControl>
      </FilterPanel>
      {loading ? <LoadingState /> : users.length === 0 ? <EmptyState text="Không tìm thấy người dùng." /> : (
        <TableContainer component={Paper} role="region" aria-label="Bảng người dùng" tabIndex={0} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto', borderRadius: '24px' }}>
          <Table size="small" sx={{ minWidth: 780 }}>
            <TableHead><TableRow><TableCell>Người dùng</TableCell><TableCell>Điện thoại</TableCell><TableCell>Vai trò</TableCell><TableCell>Trạng thái</TableCell><TableCell>Bookings</TableCell><TableCell>Ngày tham gia</TableCell><TableCell align="right">Thao tác</TableCell></TableRow></TableHead>
            <TableBody>{users.map((user) => <TableRow key={user.id} hover>
              <TableCell>{user.fullName}<Typography variant="caption" display="block" color="text.secondary">{user.email}</Typography></TableCell>
              <TableCell>{user.phone || '—'}</TableCell><TableCell><StatusChip value={user.role} /></TableCell><TableCell><StatusChip value={user.status} /></TableCell>
              <TableCell>{user.totalBookings}</TableCell><TableCell>{user.joinedAt}</TableCell>
              <TableCell align="right"><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(user)} disabled={busy}>Sửa</Button></TableCell>
            </TableRow>)}</TableBody>
          </Table>
          <Stack spacing={1} alignItems="center" sx={{ p: 2 }}>
            <Box ref={sentinelRef} sx={{ width: '100%', height: 1 }} />
            {loadingMore ? <Typography variant="caption" color="text.secondary">Đang tải thêm người dùng...</Typography> : hasMore ? <Typography variant="caption" color="text.secondary">Cuộn xuống để tải thêm người dùng.</Typography> : <Typography variant="caption" color="text.secondary">Đã hiển thị toàn bộ người dùng phù hợp.</Typography>}
          </Stack>
        </TableContainer>
      )}
    </Stack>
  )
}

function StatCard({ label, value, helper, tone = 'primary' }: { label: string; value: string; helper?: string; tone?: 'primary' | 'secondary' | 'success' | 'warning' }) {
  const toneStyles = {
    primary: { background: 'linear-gradient(135deg, rgba(115,80,124,0.16), rgba(115,80,124,0.04))', color: '#5C3E65' },
    secondary: { background: 'linear-gradient(135deg, rgba(114,139,122,0.16), rgba(114,139,122,0.04))', color: '#566960' },
    success: { background: 'linear-gradient(135deg, rgba(71,115,92,0.16), rgba(71,115,92,0.04))', color: '#47735C' },
    warning: { background: 'linear-gradient(135deg, rgba(166,126,55,0.16), rgba(166,126,55,0.04))', color: '#8B6728' },
  } as const

  return <Paper variant="outlined" sx={{ p: 2, borderRadius: '22px', bgcolor: 'background.paper', boxShadow: '0 14px 36px rgba(47,36,31,0.05)' }}>
    <Box sx={{ width: 42, height: 42, borderRadius: '14px', mb: 1.25, ...toneStyles[tone], display: 'grid', placeItems: 'center' }}>
      <BarChartIcon fontSize="small" />
    </Box>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="h5" fontWeight={800} color="primary.dark" sx={{ mt: 0.5 }}>{value}</Typography>
    {helper && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{helper}</Typography>}
  </Paper>
}

function FilterPanel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <>
    <Button variant="outlined" onClick={() => setOpen(true)} sx={{ alignSelf: 'flex-start' }}>Bộ lọc & tìm kiếm</Button>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <DialogTitle>Bộ lọc & tìm kiếm</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, pt: 1 }}>
          {children}
        </Box>
      </DialogContent>
      <DialogActions><Button onClick={() => setOpen(false)}>Xem kết quả</Button></DialogActions>
    </Dialog>
  </>
}

const adminStatusLabels: Record<string, string> = {
  ACTIVE: 'Đang hoạt động',
  MAINTENANCE: 'Đang bảo trì',
  INACTIVE: 'Ngưng hoạt động',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  SUSPENDED: 'Đã tạm khóa',
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  ADMIN: 'Quản trị viên',
  PENDING_PAYMENT: 'Chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận phòng',
  CHECKED_OUT: 'Đã trả phòng',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  PENDING: 'Đang chờ',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
  EXPIRED: 'Đã hết hạn',
  UNPAID: 'Chưa thanh toán',
}

function formatAdminStatus(value: string) {
  return adminStatusLabels[value] ?? value.toLocaleLowerCase('vi').replaceAll('_', ' ')
}

function StatusChip({ value }: { value: string }) {
  const colorMap: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'primary'> = {
    ACTIVE: 'success', CONFIRMED: 'success', PAID: 'success',
    MAINTENANCE: 'warning', PENDING_ACTIVATION: 'warning', PENDING_PAYMENT: 'warning', PENDING: 'warning', UNPAID: 'warning',
    INACTIVE: 'default', CHECKED_OUT: 'default', CUSTOMER: 'info', STAFF: 'info',
    SUSPENDED: 'danger', CANCELLED: 'danger', FAILED: 'danger', EXPIRED: 'danger',
    REFUNDED: 'secondary', CHECKED_IN: 'info', ADMIN: 'primary',
  }
  return <Badge size="small" variant={colorMap[value] ?? 'default'}>{formatAdminStatus(value)}</Badge>
}

function LoadingState() {
  return <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ minHeight: 160, borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.82)' }} role="status"><CircularProgress size={28} /><Typography color="text.secondary">Đang tải dữ liệu…</Typography></Stack>
}

function EmptyState({ text }: { text: string }) {
  return <Box sx={{ py: 5, px: 2, textAlign: 'center', borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.82)' }}><Typography color="text.secondary">{text}</Typography></Box>
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return <Stack direction="row" spacing={2} justifyContent="space-between"><Typography color="text.secondary">{label}</Typography><Typography textAlign="right" fontWeight={500}>{value}</Typography></Stack>
}

function formatBookingSource(source: AdminBooking['bookingSource']) {
  return source === 'GUEST_CHECKOUT' ? 'Guest checkout' : 'Customer account'
}
