import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import HotelRoundedIcon from '@mui/icons-material/HotelRounded'
import KingBedRoundedIcon from '@mui/icons-material/KingBedRounded'
import SpaRoundedIcon from '@mui/icons-material/SpaRounded'
import type { AuthMode } from '../components/AuthModal'
import { Badge, Button, DateRangePicker, Input } from '../components/ui'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { ApiError } from '../lib/api'
import { addCalendarDays, todayInHue, validateStay } from '../lib/bookingValidation'
import { formatCurrency } from '../lib/format'
import { checkRoomAvailability, fetchPublicRooms, type AvailabilityResult, type PublicRoomCard } from '../lib/publicApi'

type HomePageProps = {
  onOpenAuth: (mode: AuthMode) => void
}

const curatedExperience = [
  { icon: <SpaRoundedIcon fontSize="small" />, title: 'Mood boutique', description: 'Bảng màu dịu, khoảng thở rộng và cảm giác nghỉ dưỡng ngay từ màn hình đầu tiên.' },
  { icon: <KingBedRoundedIcon fontSize="small" />, title: 'Đặt phòng trực tiếp', description: 'Xem giá rõ ràng, kiểm tra phòng trống tức thì và đi thẳng vào checkout.' },
  { icon: <HotelRoundedIcon fontSize="small" />, title: 'Quản lý minh bạch', description: 'Trạng thái lưu trú, thanh toán và danh sách phòng luôn rõ trên cả khách lẫn admin.' },
]

export function HomePage(_props: HomePageProps) {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [rooms, setRooms] = useState<PublicRoomCard[]>([])
  const [roomPage, setRoomPage] = useState(1)
  const [roomTotal, setRoomTotal] = useState(0)
  const [roomHasMore, setRoomHasMore] = useState(true)
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkInDate') ?? todayInHue())
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOutDate') ?? addCalendarDays(todayInHue(), 2))
  const [guestCount, setGuestCount] = useState(() => searchParams.get('guestCount') ?? '2')
  const [availabilityResults, setAvailabilityResults] = useState<AvailabilityResult[]>([])
  const [visibleAvailabilityCount, setVisibleAvailabilityCount] = useState(6)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMoreRooms, setIsLoadingMoreRooms] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const id = location.hash.slice(1)
    if (id === 'rooms' || id === 'booking-search') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash, location.key, isLoading])

  useEffect(() => {
    let isMounted = true
    async function loadRooms() {
      if (roomPage === 1) {
        setIsLoading(true)
      } else {
        setIsLoadingMoreRooms(true)
      }
      setRoomError(null)
      try {
        const response = await fetchPublicRooms(roomPage, 6)
        if (isMounted) {
          setRooms((current) => roomPage === 1
            ? response.items
            : [...current, ...response.items.filter((room) => !current.some((existing) => existing.id === room.id))])
          setRoomTotal(response.pagination.total)
          setRoomHasMore(roomPage < response.pagination.totalPages)
        }
      } catch (error) {
        if (isMounted) {
          if (roomPage === 1) {
            setRooms([])
            setRoomTotal(0)
            setRoomHasMore(false)
          }
          setRoomError(error instanceof ApiError ? error.message : 'Không thể tải danh sách phòng. Vui lòng thử lại sau.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsLoadingMoreRooms(false)
        }
      }
    }
    void loadRooms()
    return () => { isMounted = false }
  }, [roomPage])

  const stay = { checkInDate: checkIn, checkOutDate: checkOut, guestCount: Number(guestCount) }
  const hasValidStay = Object.keys(validateStay(stay)).length === 0
  const selectedQuery = new URLSearchParams({
    checkInDate: checkIn, checkOutDate: checkOut, guestCount,
  }).toString()
  const roomPath = (slug: string, booking = false) =>
    `/${booking ? 'booking' : 'rooms'}/${encodeURIComponent(slug)}?${selectedQuery}`
  const amenities = [...new Set(rooms.flatMap((room) => room.amenities))]
  const heroRoom = rooms[0]

  const updateSearch = (setValue: (value: string) => void, value: string) => {
    setValue(value)
    setAvailabilityResults([])
    setVisibleAvailabilityCount(6)
    setHasSearched(false)
    setSearchError(null)
    setFieldErrors({})
  }

  const handleCheckAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = validateStay(stay)
    setFieldErrors(errors)
    setSearchError(null)
    setAvailabilityResults([])
    setVisibleAvailabilityCount(6)
    setHasSearched(false)
    if (Object.keys(errors).length > 0) return

    setSearchParams({ checkInDate: checkIn, checkOutDate: checkOut, guestCount }, { replace: true })
    setIsChecking(true)
    try {
      const items = await checkRoomAvailability(stay)
      setAvailabilityResults(items.filter((room) => room.available))
      setHasSearched(true)
    } catch (error) {
      setSearchError(error instanceof ApiError ? error.message : 'Không thể kiểm tra phòng trống lúc này. Vui lòng thử lại.')
    } finally {
      setIsChecking(false)
    }
  }

  const loadMoreRooms = useCallback(() => {
    if (isLoading || isLoadingMoreRooms || !roomHasMore) return
    setRoomPage((current) => current + 1)
  }, [isLoading, isLoadingMoreRooms, roomHasMore])

  const loadMoreAvailability = useCallback(() => {
    setVisibleAvailabilityCount((current) => Math.min(current + 6, availabilityResults.length))
  }, [availabilityResults.length])

  const roomSentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: roomHasMore && !isLoading && !isLoadingMoreRooms,
    onLoadMore: loadMoreRooms,
  })

  const availabilitySentinelRef = useInfiniteScroll<HTMLDivElement>({
    enabled: visibleAvailabilityCount < availabilityResults.length,
    onLoadMore: loadMoreAvailability,
  })

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Box component="section" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.15fr 0.85fr' }, gap: 3.5 }}>
        <Paper sx={(theme) => ({
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3.5, md: 5.5 },
          minHeight: { xs: 520, lg: 620 },
          borderRadius: '32px',
          color: theme.palette.common.white,
          backgroundColor: 'primary.dark',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundImage: heroRoom?.heroImage
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.95)}, ${alpha(theme.palette.primary.main, 0.72)} 42%, ${alpha('#2F241F', 0.36)}), url(${JSON.stringify(heroRoom.heroImage)})`
            : `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 'auto -15% -32% auto',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0))',
          },
        })}>
          <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, maxWidth: 660 }}>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Badge variant="secondary" sx={{ bgcolor: alpha('#FFFFFF', 0.12), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.18) }}>
                O Ni Homestay in Hue
              </Badge>
              <Badge variant="secondary" sx={{ bgcolor: alpha('#FFFFFF', 0.12), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.18) }}>
                Direct booking experience
              </Badge>
            </Stack>
            <Typography variant="h1" sx={{ maxWidth: 680 }}>
              O Ni Homestay - nơi ở mềm, sáng và đủ bình yên để chậm lại.
            </Typography>
            <Typography sx={{ maxWidth: 560, fontSize: { xs: '1rem', md: '1.08rem' }, lineHeight: 1.9, color: alpha('#FFFFFF', 0.88) }}>
              Không gian lưu trú boutique với ảnh lớn, flow đặt phòng rõ ràng và cảm giác thư thái ngay từ bước đầu.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, pt: 1 }}>
              {[
                [isLoading ? '…' : roomError ? '—' : String(roomTotal).padStart(2, '0'), 'Hạng phòng boutique'],
                ['15p', 'Giữ booking trước thanh toán'],
                ['24/7', 'Hỗ trợ khách hàng'],
              ].map(([value, label]) => (
                <Box
                  key={label}
                  sx={(theme) => ({
                    p: 2.25,
                    borderRadius: '22px',
                    bgcolor: alpha(theme.palette.common.white, 0.14),
                    border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
                    backdropFilter: 'blur(12px)',
                  })}
                >
                  <Typography variant="h4" component="p">{value}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, color: alpha('#FFFFFF', 0.8) }}>{label}</Typography>
                </Box>
              ))}
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 1 }}>
              <Button variant="primary" size="lg" component={Link} to="/#booking-search">Đặt phòng ngay</Button>
              <Button variant="outline" size="lg" component={Link} to="/#rooms" sx={{ bgcolor: alpha('#FFFFFF', 0.14), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.26), '&:hover': { bgcolor: alpha('#FFFFFF', 0.2), borderColor: alpha('#FFFFFF', 0.34) } }}>
                Xem bộ sưu tập phòng
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          component="section"
          id="booking-search"
          sx={{
            p: { xs: 3, md: 3.75 },
            borderRadius: '28px',
            scrollMarginTop: 112,
            bgcolor: 'rgba(255,253,249,0.92)',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 24px 64px rgba(47, 36, 31, 0.08)',
          }}
        >
          <Typography variant="overline" color="primary">Kiểm tra phòng trống</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.1rem' }, mb: 1.25 }}>
            Bắt đầu từ một kỳ nghỉ rất nhẹ.
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 420 }}>
          Chọn ngày lưu trú và xem ngay những phòng phù hợp.
          </Typography>

          <Stack component="form" onSubmit={handleCheckAvailability} noValidate spacing={2} aria-busy={isChecking}>
            <DateRangePicker
              checkInDate={checkIn}
              checkOutDate={checkOut}
              onCheckInChange={(value) => updateSearch(setCheckIn, value)}
              onCheckOutChange={(value) => updateSearch(setCheckOut, value)}
              disabled={isChecking}
              hint="Chọn ngày nhận phòng và trả phòng theo lịch tại Huế."
              error={fieldErrors.checkInDate ?? fieldErrors.checkOutDate}
            />
            <Input
              type="number"
              label="Số khách"
              value={guestCount}
              disabled={isChecking}
              onChange={(event) => updateSearch(setGuestCount, event.target.value)}
              min={1}
              step={1}
              error={fieldErrors.guestCount}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isChecking}
              startIcon={isChecking ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRoundedIcon fontSize="small" />}
            >
              {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra phòng trống'}
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ mt: 2 }} aria-live="polite">
            {searchError && <Alert severity="error">{searchError}</Alert>}
            {hasSearched && (
              <Alert severity={availabilityResults.length ? 'success' : 'info'}>
                {availabilityResults.length
                  ? `Đã tìm thấy ${availabilityResults.length} phòng trống cho khoảng ngày bạn chọn.`
                  : 'Hiện chưa có phòng trống phù hợp cho khoảng ngày này. Bạn có thể chọn ngày khác.'}
              </Alert>
            )}
            {availabilityResults.slice(0, visibleAvailabilityCount).map((room) => (
              <Paper
                key={room.roomId}
                variant="outlined"
                sx={{
                  p: 2.25,
                  borderRadius: '20px',
                  bgcolor: 'background.paper',
                  borderColor: alpha('#73507C', 0.12),
                }}
              >
                <Typography variant="h6" component="h3">{room.name}</Typography>
                <Typography variant="body2" color="text.secondary">{room.nightCount} đêm • Tối đa {room.maxGuests} khách</Typography>
                <Typography color="primary" sx={{ fontWeight: 700, my: 1 }}>{formatCurrency(room.totalAmount)}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button component={Link} to={roomPath(room.slug)} variant="outline">Xem chi tiết</Button>
                  <Button component={Link} to={roomPath(room.slug, true)} variant="primary">Đặt phòng</Button>
                </Stack>
              </Paper>
            ))}
            {availabilityResults.length > 6 && (
              <Stack spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Đã hiển thị {Math.min(visibleAvailabilityCount, availabilityResults.length)} / {availabilityResults.length} phòng còn trống
                </Typography>
                {visibleAvailabilityCount < availabilityResults.length && (
                  <>
                    <Box ref={availabilitySentinelRef} sx={{ width: '100%', height: 1 }} />
                    <Typography variant="caption" color="text.secondary">Cuộn xuống để tải thêm.</Typography>
                  </>
                )}
              </Stack>
            )}
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {curatedExperience.map((item) => (
              <Paper key={item.title} variant="outlined" sx={{ p: 2, borderRadius: '18px', bgcolor: 'rgba(255,255,255,0.7)' }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <Box sx={{ width: 38, height: 38, borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'primary.light', color: 'primary.dark' }}>
                    {item.icon}
                  </Box>
                  <Typography fontWeight={700}>{item.title}</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{item.description}</Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      </Box>

      <Box component="section" id="rooms" sx={{ py: { xs: 4, md: 6 }, scrollMarginTop: 112 }}>
        <Typography variant="overline" color="primary">Phòng nổi bật</Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.7rem' } }}>Những không gian với những nhịp cảm xúc riêng.</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 620 }}>
          Chọn một nơi nghỉ ngơi ấm cúng cho những ngày thư thái ở Huế.
        </Typography>
        {roomError && <Alert severity="error" sx={{ mt: 3 }}>{roomError}</Alert>}
        {!isLoading && !roomError && roomTotal === 0 && <Alert severity="info" sx={{ mt: 3 }}>Hiện chưa có phòng để giới thiệu. Vui lòng quay lại sau.</Alert>}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 3, mt: 4 }}>
          {isLoading ? [0, 1, 2].map((index) => (
            <Skeleton key={index} variant="rounded" height={520} aria-label="Đang tải phòng" sx={{ borderRadius: '28px' }} />
          )) : rooms.map((room) => (
            <Card
              key={room.id}
              sx={{
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: 'rgba(255,253,249,0.96)',
                borderColor: alpha('#73507C', 0.12),
              }}
            >
              {room.cardImage && <CardMedia component="img" image={room.cardImage} alt={room.name} loading="lazy" sx={{ aspectRatio: '16 / 11', height: 'auto', objectFit: 'cover' }} />}
              <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  {room.atmosphere.slice(0, 2).map((tag) => <Badge key={tag} variant="primary">{tag}</Badge>)}
                </Stack>
                <Typography variant="h3">{room.name}</Typography>
                <Typography variant="body2" color="text.secondary">{room.shortDescription}</Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                  <Badge variant="default">{room.size}</Badge>
                  <Badge variant="default">{room.maxGuests} khách</Badge>
                  <Badge variant="default">{room.bedInfo}</Badge>
                </Stack>
                <Box sx={{ mt: 'auto' }}>
                  <Typography variant="body2" color="text.secondary">Giá mỗi đêm</Typography>
                  <Typography variant="h5" component="p" color="primary">{formatCurrency(room.pricePerNight)}</Typography>
                </Box>
                <Stack direction="row" useFlexGap flexWrap="wrap" gap={1}>
                  {room.features.slice(0, 3).map((feature) => <Badge key={feature} variant="secondary">{feature}</Badge>)}
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}>
                  <Button component={Link} to={roomPath(room.slug)} variant="outline" fullWidth>Xem chi tiết</Button>
                  <Button component={Link} to={roomPath(room.slug, true)} variant="primary" fullWidth disabled={!hasValidStay}>Đặt ngay</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
        {!isLoading && !roomError && roomTotal > 0 && (
          <Stack spacing={1} alignItems="center" sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Đã hiển thị {rooms.length} / {roomTotal} hạng phòng
            </Typography>
            {roomHasMore && <Typography variant="caption" color="text.secondary">Tiếp tục cuộn để tải thêm phòng.</Typography>}
            <Box ref={roomSentinelRef} sx={{ width: '100%', height: 1 }} />
            {isLoadingMoreRooms && <Typography variant="caption" color="text.secondary">Đang tải thêm phòng...</Typography>}
          </Stack>
        )}
      </Box>

      <Box component="section" sx={{ pb: { xs: 6, md: 9 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' }, gap: 4 }}>
        <Box>
          <Typography variant="overline" color="primary">Tiện nghi</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' } }}>Tiện nghi vừa đủ, cảm giác nhiều hơn.</Typography>
          <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.8 }}>Những tiện nghi xuất hiện xuyên suốt ở các phòng đang mở bán.</Typography>
        </Box>
        <Box>
          {isLoading ? <Skeleton variant="rounded" height={180} sx={{ borderRadius: '24px' }} /> : amenities.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.92)' }}>
              <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.25}>
                {amenities.map((amenity) => <Badge key={amenity} variant="secondary">{amenity}</Badge>)}
              </Stack>
            </Paper>
          ) : <Typography color="text.secondary">Thông tin tiện nghi sẽ được cập nhật cùng các phòng.</Typography>}
        </Box>
      </Box>

      <Paper component="section" sx={{ p: { xs: 3.5, md: 5 }, borderRadius: '30px', mb: 4, bgcolor: 'rgba(255,253,249,0.92)', boxShadow: '0 24px 64px rgba(47,36,31,0.08)' }}>
        <Typography variant="overline" color="primary">Vị trí & liên hệ</Typography>
        <Typography variant="h2" sx={{ fontSize: { xs: '1.8rem', md: '2.6rem' } }}>Một chốn bình yên giữa lòng thành phố Huế.</Typography>
        <Typography color="text.secondary" sx={{ mt: 2, lineHeight: 1.8, maxWidth: 720 }}>
          O Ni Homestay mang đến không gian boutique ấm cúng cho hành trình khám phá Huế. Liên hệ O Ni Homestay để được hướng dẫn đường đi và tư vấn kỳ nghỉ.
        </Typography>
      </Paper>
    </Container>
  )
}
