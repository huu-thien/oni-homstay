// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './HomePage'
import { RoomDetailPage } from './RoomDetailPage'
import { addCalendarDays, todayInHue } from '../lib/bookingValidation'
import { checkRoomAvailability, fetchPublicRooms, fetchRoomDetail, type PublicRoomDetail } from '../lib/publicApi'

vi.mock('../lib/publicApi', () => ({
  fetchPublicRooms: vi.fn(),
  fetchRoomDetail: vi.fn(),
  checkRoomAvailability: vi.fn(),
}))

const room: PublicRoomDetail = {
  id: 'catalog-room', slug: 'river-room', name: 'Phòng bên sông', roomType: 'DOUBLE',
  subtitle: 'Ánh sáng dịu bên cửa sổ', shortDescription: 'Một nơi nghỉ ngơi yên tĩnh.',
  description: 'Không gian ấm cúng cho kỳ nghỉ ở Huế.', heroImage: '/images/hero.jpg',
  cardImage: '/images/card.jpg', pricePerNight: 900000, maxGuests: 4, size: '30m²',
  bedInfo: '1 giường đôi', highlight: 'Cửa sổ hướng sông', features: ['Wi-Fi'],
  amenities: ['Máy lạnh', 'Wi-Fi'], atmosphere: ['Thư thái'], checkIn: '14:00',
  checkOut: '11:00', sizeSqm: 30, bedroomCount: 1, bedCount: 1, bathroomCount: 1,
  status: 'ACTIVE',
  images: [{ id: 'gallery-image', title: 'Góc cửa sổ', url: '/images/window.jpg', altText: 'Góc cửa sổ', isCover: false, sortOrder: 1 }],
  gallery: [{ title: 'Góc cửa sổ', image: '/images/window.jpg' }],
}

function stayQuery() {
  return new URLSearchParams({
    checkInDate: addCalendarDays(todayInHue(), 3),
    checkOutDate: addCalendarDays(todayInHue(), 6),
    guestCount: '3',
  }).toString()
}

function renderCatalog(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<HomePage onOpenAuth={vi.fn()} />} />
        <Route path="/rooms/:slug" element={<RoomDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function submitSearch() {
  fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra phòng trống' }))
}

const scrollIntoView = vi.fn()
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
const observers: MockIntersectionObserver[] = []

class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  elements = new Set<Element>()

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    observers.push(this)
  }

  observe = (element: Element) => {
    this.elements.add(element)
  }

  unobserve = (element: Element) => {
    this.elements.delete(element)
  }

  disconnect = () => {
    this.elements.clear()
  }

  takeRecords = () => []
}

function triggerIntersection() {
  for (const observer of observers) {
    const [target] = observer.elements
    if (!target) continue
    observer.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], observer as unknown as IntersectionObserver)
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  observers.length = 0
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  vi.mocked(fetchPublicRooms).mockResolvedValue({
    items: [room],
    pagination: { page: 1, limit: 6, total: 1, totalPages: 1 },
  })
  vi.mocked(fetchRoomDetail).mockResolvedValue(room)
  vi.mocked(checkRoomAvailability).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (originalScrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView)
  } else {
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
  }
  vi.unstubAllGlobals()
})

describe('Home catalog', () => {
  it.each(['same-day', 'reversed', 'past', 'missing'])('rejects %s dates before calling availability', async (kind) => {
    renderCatalog(`/?${stayQuery()}`)
    await screen.findByRole('heading', { name: room.name })
    const checkIn = addCalendarDays(todayInHue(), 3)
    const value = kind === 'past' ? addCalendarDays(todayInHue(), -1) : kind === 'missing' ? '' : checkIn
    fireEvent.change(screen.getByLabelText('Ngày nhận phòng'), { target: { value } })
    if (kind === 'same-day' || kind === 'reversed') {
      fireEvent.change(screen.getByLabelText('Ngày trả phòng'), {
        target: { value: kind === 'same-day' ? checkIn : addCalendarDays(checkIn, -1) },
      })
    }
    submitSearch()
    expect(checkRoomAvailability).not.toHaveBeenCalled()
    expect(screen.getByText(kind === 'past'
      ? 'Vui lòng chọn ngày nhận phòng từ hôm nay.'
      : kind === 'missing' ? 'Ngày nhận phòng không hợp lệ.' : 'Ngày trả phòng phải sau ngày nhận phòng.')).toBeTruthy()
  })

  it.each(['0', '1.5', ''])('rejects invalid guest count %s before calling availability', async (value) => {
    renderCatalog(`/?${stayQuery()}`)
    await screen.findByRole('heading', { name: room.name })
    fireEvent.change(screen.getByLabelText('Số khách'), { target: { value } })
    submitSearch()
    expect(checkRoomAvailability).not.toHaveBeenCalled()
    expect(screen.getByText('Số khách phải là số nguyên dương.')).toBeTruthy()
  })

  it('uses the API and preserves selected dates and guests in catalog and availability links', async () => {
    vi.mocked(checkRoomAvailability).mockResolvedValue([{
      ...room, roomId: room.id, available: true, nightCount: 3, totalAmount: 2700000,
    }])
    const query = stayQuery()
    renderCatalog(`/?${query}`)
    await screen.findByRole('heading', { name: room.name })
    submitSearch()
    await screen.findByText('Đã tìm thấy 1 phòng trống cho khoảng ngày bạn chọn.')
    expect(checkRoomAvailability).toHaveBeenCalledWith({
      checkInDate: addCalendarDays(todayInHue(), 3),
      checkOutDate: addCalendarDays(todayInHue(), 6),
      guestCount: 3,
    })
    for (const link of screen.getAllByRole('link', { name: 'Xem chi tiết' })) {
      expect(link.getAttribute('href')).toBe(`/rooms/${room.slug}?${query}`)
    }
    expect(screen.getByRole('link', { name: 'Đặt phòng' }).getAttribute('href')).toBe(`/booking/${room.slug}?${query}`)
    expect(screen.getByRole('link', { name: 'Đặt ngay' }).getAttribute('href')).toBe(`/booking/${room.slug}?${query}`)
  })

  it('loads more room cards when the infinite-scroll sentinel becomes visible', async () => {
    const secondRoom = { ...room, id: 'second-room', slug: 'second-room', name: 'Phòng trang hai' }
    vi.mocked(fetchPublicRooms).mockImplementation(async (page = 1) => ({
      items: page === 1 ? [room] : [secondRoom],
      pagination: { page, limit: 6, total: 7, totalPages: 2 },
    }))
    renderCatalog('/')
    await screen.findByRole('heading', { name: room.name })
    expect(screen.getByText('Đã hiển thị 1 / 7 hạng phòng')).toBeTruthy()
    triggerIntersection()
    await screen.findByRole('heading', { name: secondRoom.name })
    expect(fetchPublicRooms).toHaveBeenLastCalledWith(2, 6)
    expect(screen.getByText('Đã hiển thị 2 / 7 hạng phòng')).toBeTruthy()
  })

  it('reveals more availability results when the infinite-scroll sentinel becomes visible', async () => {
    vi.mocked(checkRoomAvailability).mockResolvedValue(Array.from({ length: 7 }, (_, index) => ({
      ...room,
      id: `available-${index + 1}`,
      slug: `available-${index + 1}`,
      name: `Phòng còn trống ${index + 1}`,
      roomId: `available-${index + 1}`,
      available: true,
      nightCount: 3,
      totalAmount: 2700000,
    })))
    renderCatalog(`/?${stayQuery()}`)
    await screen.findByRole('heading', { name: room.name })
    submitSearch()
    await screen.findByText('Đã tìm thấy 7 phòng trống cho khoảng ngày bạn chọn.')
    expect(screen.getAllByRole('link', { name: 'Đặt phòng' })).toHaveLength(6)
    expect(screen.getByText('Đã hiển thị 6 / 7 phòng còn trống')).toBeTruthy()
    triggerIntersection()
    await waitFor(() => expect(screen.getAllByRole('link', { name: 'Đặt phòng' })).toHaveLength(7))
    expect(screen.getByText('Đã hiển thị 7 / 7 phòng còn trống')).toBeTruthy()
  })

  it('does not count or offer booking for unavailable API results', async () => {
    vi.mocked(fetchPublicRooms).mockResolvedValue({
      items: [], pagination: { page: 1, limit: 6, total: 0, totalPages: 1 },
    })
    vi.mocked(checkRoomAvailability).mockResolvedValue([
      { ...room, roomId: room.id, available: false, nightCount: 3, totalAmount: 2700000 },
      { ...room, name: 'Phòng còn trống', slug: 'available-room', roomId: 'available', available: true, nightCount: 3, totalAmount: 2700000 },
    ])
    renderCatalog(`/?${stayQuery()}`)
    submitSearch()
    await screen.findByText('Đã tìm thấy 1 phòng trống cho khoảng ngày bạn chọn.')
    expect(screen.queryByRole('heading', { name: room.name })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Phòng còn trống' })).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Đặt phòng' })).toHaveLength(1)
  })

  it('shows empty availability feedback when all results are unavailable', async () => {
    vi.mocked(checkRoomAvailability).mockResolvedValue([{
      ...room, roomId: room.id, available: false, nightCount: 3, totalAmount: 2700000,
    }])
    renderCatalog(`/?${stayQuery()}`)
    submitSearch()
    await screen.findByText('Hiện chưa có phòng trống phù hợp cho khoảng ngày này. Bạn có thể chọn ngày khác.')
    expect(screen.queryByRole('link', { name: 'Đặt phòng' })).toBeNull()
  })

  it('shows availability API errors without fabricated results', async () => {
    vi.mocked(checkRoomAvailability).mockRejectedValue(new Error('Network failure'))
    renderCatalog(`/?${stayQuery()}`)
    submitSearch()
    await screen.findByText('Không thể kiểm tra phòng trống lúc này. Vui lòng thử lại.')
    expect(screen.queryByRole('link', { name: 'Đặt phòng' })).toBeNull()
  })

  it.each(['rooms', 'booking-search'])('scrolls to the #%s header target on mount', async (id) => {
    renderCatalog(`/#${id}`)
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    expect(scrollIntoView.mock.contexts.some((element) => element instanceof HTMLElement && element.id === id)).toBe(true)
    expect(document.getElementById(id)).toBeTruthy()
  })
})

describe('Room detail catalog', () => {
  it('shows loading feedback while the detail request is pending', () => {
    vi.mocked(fetchRoomDetail).mockReturnValue(new Promise(() => {}))
    renderCatalog(`/rooms/${room.slug}`)
    expect(screen.getByRole('status').textContent).toBe('Đang tải chi tiết phòng...')
    expect(fetchRoomDetail).toHaveBeenCalledWith(room.slug)
    expect(screen.queryByRole('link', { name: 'Tiếp tục đặt phòng' })).toBeNull()
  })

  it('shows error feedback and a home link preserving the stay', async () => {
    vi.mocked(fetchRoomDetail).mockRejectedValue(new Error('Network failure'))
    const query = stayQuery()
    renderCatalog(`/rooms/${room.slug}?${query}`)
    await screen.findByRole('heading', { name: 'Không tải được chi tiết phòng' })
    expect(screen.getByRole('alert').textContent).toContain('Không thể tải chi tiết phòng.')
    expect(screen.getByRole('link', { name: 'Quay về trang chủ' }).getAttribute('href')).toBe(`/?${query}`)
  })

  it('renders API gallery, amenities, policies and stay-preserving booking links', async () => {
    const query = stayQuery()
    renderCatalog(`/rooms/${room.slug}?${query}`)
    await screen.findByRole('heading', { name: room.name })
    expect(screen.getByRole('img', { name: 'Góc cửa sổ' }).getAttribute('src')).toBe('/images/window.jpg')
    expect(screen.getByText('Máy lạnh')).toBeTruthy()
    expect(screen.getByText(`Nhận phòng từ ${room.checkIn}`)).toBeTruthy()
    expect(screen.getByText(`Trả phòng trước ${room.checkOut}`)).toBeTruthy()
    expect(screen.getByText('3 đêm • 3 khách')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tiếp tục đặt phòng' }).getAttribute('href')).toBe(`/booking/${room.slug}?${query}`)
    expect(screen.getByRole('link', { name: 'Xem thêm các phòng khác' }).getAttribute('href')).toBe(`/?${query}#rooms`)
  })

  it('scrolls to rooms after returning from detail and retains the selected search', async () => {
    const query = stayQuery()
    renderCatalog(`/rooms/${room.slug}?${query}`)
    fireEvent.click(await screen.findByRole('link', { name: 'Xem thêm các phòng khác' }))
    await screen.findByRole('heading', { name: 'Những không gian với những nhịp cảm xúc riêng.' })
    await waitFor(() => expect(scrollIntoView.mock.contexts.some((element) => element instanceof HTMLElement && element.id === 'rooms')).toBe(true))
    expect((screen.getByLabelText('Số khách') as HTMLInputElement).value).toBe('3')
    expect((screen.getByLabelText('Ngày nhận phòng') as HTMLInputElement).value).toBe(addCalendarDays(todayInHue(), 3))
    expect((screen.getByLabelText('Ngày trả phòng') as HTMLInputElement).value).toBe(addCalendarDays(todayInHue(), 6))
  })

  it('updates booking links when the guest changes the stay', async () => {
    renderCatalog(`/rooms/${room.slug}?${stayQuery()}`)
    await screen.findByRole('heading', { name: room.name })
    fireEvent.change(screen.getByLabelText('Số khách'), { target: { value: '2' } })
    const href = screen.getByRole('link', { name: 'Tiếp tục đặt phòng' }).getAttribute('href')
    expect(new URL(href!, 'https://homestay.example').searchParams.get('guestCount')).toBe('2')
  })

  it('prevents booking beyond room capacity', async () => {
    renderCatalog(`/rooms/${room.slug}?${stayQuery()}`)
    await screen.findByRole('heading', { name: room.name })
    fireEvent.change(screen.getByLabelText('Số khách'), { target: { value: '5' } })
    expect(screen.getByText('Số khách phải từ 1 đến 4.')).toBeTruthy()
    expect(screen.getByText('Tiếp tục đặt phòng').getAttribute('aria-disabled')).toBe('true')
  })
})
