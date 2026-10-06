import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Container,
  Dialog,
  Divider,
  IconButton,
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded'
import { Badge, Button, DateRangePicker, Input } from '../components/ui'
import { ApiError } from '../lib/api'
import { addCalendarDays, countNights, overlapsBookedDates, todayInHue, validateStay } from '../lib/bookingValidation'
import { formatCurrency } from '../lib/format'
import { fetchRoomDetail, type PublicRoomDetail } from '../lib/publicApi'

export function RoomDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [room, setRoom] = useState<PublicRoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkInDate') ?? todayInHue())
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOutDate') ?? addCalendarDays(todayInHue(), 2))
  const [guestCount, setGuestCount] = useState(() => searchParams.get('guestCount') ?? '1')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    setCheckIn(searchParams.get('checkInDate') ?? todayInHue())
    setCheckOut(searchParams.get('checkOutDate') ?? addCalendarDays(todayInHue(), 2))
    setGuestCount(searchParams.get('guestCount') ?? '1')
  }, [searchParams])

  useEffect(() => {
    setRoom(null)
    if (!slug) {
      setIsLoading(false)
      setErrorMessage('Đường dẫn phòng không hợp lệ.')
      return
    }
    const roomSlug = slug
    let isMounted = true
    setIsLoading(true)
    setErrorMessage(null)
    async function loadRoom() {
      try {
        const response = await fetchRoomDetail(roomSlug)
        if (isMounted) setRoom(response)
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof ApiError ? error.message : 'Không thể tải chi tiết phòng. Vui lòng thử lại sau.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadRoom()
    return () => { isMounted = false }
  }, [slug])

  const selectedQuery = new URLSearchParams({
    checkInDate: checkIn, checkOutDate: checkOut, guestCount,
  }).toString()
  const homePath = `/?${selectedQuery}`

  const galleryItems = useMemo(() => {
    if (!room) return []
    if (room.images.length > 0) {
      return room.images.map((item) => ({
        title: item.title || room.name,
        image: item.url,
        altText: item.altText || item.title || room.name,
      }))
    }
    return room.gallery.map((item) => ({
      title: item.title || room.name,
      image: item.image,
      altText: item.title || room.name,
    }))
  }, [room])

  const heroGallery = galleryItems.slice(0, 5)

  if (isLoading) {
    return (
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }} aria-busy="true">
        <Typography role="status" sx={{ mb: 2 }}>Đang tải chi tiết phòng...</Typography>
        <Skeleton variant="rounded" height={420} sx={{ borderRadius: '28px' }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mt: 3 }}>
          <Skeleton variant="rounded" height={240} width="100%" sx={{ borderRadius: '24px' }} />
          <Skeleton variant="rounded" height={240} width="100%" sx={{ borderRadius: '24px' }} />
        </Stack>
      </Container>
    )
  }

  if (errorMessage || !room) {
    return (
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: '28px' }}>
          <Typography variant="h1" sx={{ fontSize: '2rem', mb: 3 }}>Không tải được chi tiết phòng</Typography>
          <Alert severity="error">{errorMessage ?? 'Dữ liệu phòng hiện không khả dụng.'}</Alert>
          <Button component={Link} to={homePath} variant="primary" sx={{ mt: 3 }}>Quay về trang chủ</Button>
        </Paper>
      </Container>
    )
  }

  const errors = validateStay({
    checkInDate: checkIn, checkOutDate: checkOut, guestCount: Number(guestCount),
  }, room.maxGuests)
  if (overlapsBookedDates(checkIn, checkOut, room.bookedDateRanges)) {
    errors.checkOutDate = 'Khoảng ngày này đã có người đặt. Vui lòng chọn ngày khác.'
  }
  const validStay = Object.keys(errors).length === 0
  const nightCount = validStay ? countNights(checkIn, checkOut) : 0
  const activeImageIndex = lightboxIndex ?? 0
  const activeImage = galleryItems[activeImageIndex]

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 6 } }}>
      <Breadcrumbs sx={{ mb: 3 }} aria-label="Điều hướng">
        <MuiLink component={Link} to={homePath} underline="hover" color="inherit">Trang chủ</MuiLink>
        <Typography color="text.primary">{room.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.12fr 0.88fr' }, gap: 4, alignItems: 'start' }}>
        <Stack spacing={3.5}>
          <Paper
            component="section"
            sx={(theme) => ({
              p: { xs: 3.5, md: 5 },
              borderRadius: '32px',
              color: theme.palette.common.white,
              bgcolor: 'primary.dark',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundImage: room.heroImage
                ? `linear-gradient(120deg, ${alpha(theme.palette.primary.dark, 0.94)}, ${alpha(theme.palette.primary.main, 0.68)} 48%, ${alpha('#2F241F', 0.34)}), url(${JSON.stringify(room.heroImage)})`
                : undefined,
            })}
          >
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
              <Badge variant="secondary" sx={{ bgcolor: alpha('#FFFFFF', 0.12), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.22) }}>{room.size}</Badge>
              <Badge variant="secondary" sx={{ bgcolor: alpha('#FFFFFF', 0.12), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.22) }}>{room.roomType}</Badge>
            </Stack>
            <Typography variant="h1" sx={{ mt: 2, fontSize: { xs: '2.4rem', md: '3.7rem' } }}>{room.name}</Typography>
            <Typography sx={{ mt: 2, maxWidth: 620, lineHeight: 1.85 }}>{room.subtitle}</Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 3 }}>
              {[`${room.maxGuests} khách`, room.bedInfo, `${formatCurrency(room.pricePerNight)} / đêm`].filter(Boolean).map((item) => (
                <Badge key={item} variant="secondary" sx={{ bgcolor: alpha('#FFFFFF', 0.16), color: '#FFFFFF', borderColor: alpha('#FFFFFF', 0.2) }}>{item}</Badge>
              ))}
            </Stack>
          </Paper>

          <Box component="section">
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="overline" color="primary">Hero gallery</Typography>
                <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>Khung hình chi tiết để xem phòng thật trực quan.</Typography>
              </Box>
              {galleryItems.length > 0 && (
                <Button variant="outline" startIcon={<FullscreenRoundedIcon />} onClick={() => setLightboxIndex(0)}>
                  Xem từng ảnh
                </Button>
              )}
            </Stack>
            {heroGallery.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.3fr 0.7fr' }, gap: 2 }}>
                <Paper
                  sx={{ overflow: 'hidden', borderRadius: '26px', aspectRatio: { xs: '16 / 11', md: '16 / 12' }, position: 'relative', cursor: 'pointer' }}
                  onClick={() => setLightboxIndex(0)}
                >
                  <Box component="img" src={heroGallery[0]?.image} alt={`${heroGallery[0]?.altText || room.name} - ảnh nổi bật`} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(47,36,31,0.04), rgba(47,36,31,0.56))' }} />
                  <Stack spacing={0.75} sx={{ position: 'absolute', left: 18, right: 18, bottom: 18, color: '#FFFFFF' }}>
                    <Typography variant="h6">{heroGallery[0]?.title || room.name}</Typography>
                    <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.82) }}>Chạm để mở lightbox và duyệt ảnh qua lại.</Typography>
                  </Stack>
                </Paper>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                  {heroGallery.slice(1).map((item, index) => (
                    <Paper
                      key={`${item.image}-${index}`}
                      sx={{ overflow: 'hidden', borderRadius: '22px', aspectRatio: '1 / 1', cursor: 'pointer', position: 'relative' }}
                      onClick={() => setLightboxIndex(index + 1)}
                    >
                      <Box component="img" src={item.image} alt={`${item.altText} - xem nhanh ${index + 2}`} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {index === 3 && galleryItems.length > 5 && (
                        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(47,36,31,0.45)', color: '#FFFFFF' }}>
                          <Typography variant="h6">+{galleryItems.length - 5} ảnh</Typography>
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : <Alert severity="info">Hình ảnh phòng đang được cập nhật.</Alert>}
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' }, gap: 2 }}>
            <Paper sx={{ p: 3.25, borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.92)' }}>
              <Typography variant="h6">Mô tả không gian</Typography>
              <Typography color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.9, whiteSpace: 'pre-line' }}>{room.description}</Typography>
            </Paper>
            <Stack spacing={2}>
              <Paper sx={{ p: 3, borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.92)' }}>
                <Typography variant="h6">Điểm nhấn lưu trú</Typography>
                <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.85 }}>
                  {room.highlight || 'Không gian được thiết kế theo tinh thần lưu trú boutique nhẹ nhàng và dễ thư giãn.'}
                </Typography>
              </Paper>
              <Paper sx={{ p: 3, borderRadius: '24px', bgcolor: 'rgba(255,253,249,0.92)' }}>
                <Typography variant="h6">Bố cục sử dụng</Typography>
                <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.85 }}>
                  {room.bedroomCount} phòng ngủ • {room.bedCount} giường • {room.bathroomCount} phòng tắm
                </Typography>
              </Paper>
            </Stack>
          </Box>

          <Box component="section">
            <Typography variant="h2" sx={{ fontSize: '1.8rem', mb: 1.25 }}>Hình ảnh phòng</Typography>
            <Typography color="text.secondary" sx={{ mb: 2.5 }}>Ảnh được giữ cùng tỷ lệ để phần visual và phần nội dung cân hơn khi đọc.</Typography>
            {galleryItems.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                {galleryItems.map((item, index) => (
                  <Paper key={`${item.image}-${index}`} component="figure" sx={{ m: 0, overflow: 'hidden', borderRadius: '22px', cursor: 'pointer' }} onClick={() => setLightboxIndex(index)}>
                    <Box component="img" src={item.image} alt={item.altText} loading="lazy" sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
                    <Typography component="figcaption" variant="body2" sx={{ p: 2 }}>{item.title || room.name}</Typography>
                  </Paper>
                ))}
              </Box>
            ) : <Alert severity="info">Hình ảnh phòng đang được cập nhật.</Alert>}
          </Box>

          <Paper component="section" sx={{ p: 3.5, borderRadius: '24px' }}>
            <Typography variant="h2" sx={{ fontSize: '1.6rem' }}>Tiện nghi nổi bật</Typography>
            {room.amenities.length > 0 ? (
              <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} sx={{ mt: 3 }}>
                {room.amenities.map((amenity) => <Badge key={amenity} variant="default">{amenity}</Badge>)}
              </Stack>
            ) : <Typography color="text.secondary" sx={{ mt: 2 }}>Thông tin tiện nghi đang được cập nhật.</Typography>}
          </Paper>

          <Paper component="section" sx={{ p: 3.5, borderRadius: '24px' }}>
            <Typography variant="h2" sx={{ fontSize: '1.6rem' }}>Chính sách lưu trú</Typography>
            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Typography>Nhận phòng từ {room.checkIn}</Typography>
              <Typography>Trả phòng trước {room.checkOut}</Typography>
              <Typography color="text.secondary">Thanh toán QR chuyển khoản. Đặt phòng được xác nhận sau khi thanh toán thành công.</Typography>
              <Typography color="text.secondary">Giá mỗi đêm được homestay áp dụng và hiển thị trước khi bạn đặt phòng.</Typography>
            </Stack>
          </Paper>
        </Stack>

        <Paper
          component="aside"
          sx={{
            p: { xs: 3.5, md: 4 },
            borderRadius: '28px',
            position: { lg: 'sticky' },
            top: { lg: 112 },
            bgcolor: 'rgba(255,253,249,0.92)',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 22px 60px rgba(47, 36, 31, 0.08)',
          }}
        >
          <Typography variant="overline" color="primary">Kỳ nghỉ của bạn</Typography>
          <Typography variant="h2" sx={{ fontSize: '1.9rem', mt: 1 }}>Đặt phòng thật nhanh, không cần đăng nhập trước.</Typography>
          <Stack spacing={2} sx={{ mt: 3 }}>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography color="text.secondary">Giá mỗi đêm</Typography>
              <Typography color="primary" fontWeight={700}>{formatCurrency(room.pricePerNight)}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">Tối đa {room.maxGuests} khách • {room.bedInfo}</Typography>
            <Divider />
            <DateRangePicker
              bookedDateRanges={room.bookedDateRanges}
              checkInDate={checkIn}
              checkOutDate={checkOut}
              onCheckInChange={setCheckIn}
              onCheckOutChange={setCheckOut}
              error={errors.checkInDate ?? errors.checkOutDate}
              hint="Bạn có thể đổi ngày bất cứ lúc nào trước khi sang bước đặt phòng."
            />
            <Input
              type="number"
              label="Số khách"
              value={guestCount}
              onChange={(event) => setGuestCount(event.target.value)}
              min={1}
              max={room.maxGuests}
              step={1}
              error={errors.guestCount}
            />
            {validStay && (
              <Box aria-live="polite">
                <Typography color="text.secondary">{nightCount} đêm • {guestCount} khách</Typography>
                <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mt: 1 }}>
                  <Typography>Tổng tiền lưu trú</Typography>
                  <Typography color="primary" fontWeight={700}>{formatCurrency(room.pricePerNight * nightCount)}</Typography>
                </Stack>
              </Box>
            )}
            <Button
              component={Link}
              to={`/booking/${encodeURIComponent(room.slug)}?${selectedQuery}`}
              variant="primary"
              size="lg"
              disabled={!validStay || room.status !== 'ACTIVE'}
            >
              Tiếp tục đặt phòng
            </Button>
            {room.status !== 'ACTIVE' && <Alert severity="info">Phòng hiện không mở nhận đặt phòng.</Alert>}
            <Typography variant="body2" color="text.secondary">Tình trạng phòng trống sẽ được kiểm tra khi đặt phòng.</Typography>
            <Button component={Link} to={`${homePath}#rooms`} variant="outline">Xem thêm các phòng khác</Button>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
              Mọi thắc mắc vui lòng liên hệ O Ni Homestay để được hỗ trợ chu đáo nhất.
            </Typography>
          </Stack>
        </Paper>
      </Box>

      <Dialog
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1F1815',
            color: '#FFFFFF',
            borderRadius: '28px',
            overflow: 'hidden',
          },
        }}
      >
        {activeImage && (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">{activeImage.title || room.name}</Typography>
                <Typography variant="body2" sx={{ color: alpha('#FFFFFF', 0.74) }}>
                  Ảnh {activeImageIndex + 1} / {galleryItems.length}
                </Typography>
              </Box>
              <IconButton onClick={() => setLightboxIndex(null)} sx={{ color: '#FFFFFF' }} aria-label="Đóng xem ảnh">
                <CloseRoundedIcon />
              </IconButton>
            </Stack>
            <Box sx={{ position: 'relative' }}>
              <Paper sx={{ overflow: 'hidden', borderRadius: '22px', bgcolor: '#120F0E' }}>
                <Box component="img" src={activeImage.image} alt={activeImage.altText} sx={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block', marginInline: 'auto' }} />
              </Paper>
              {galleryItems.length > 1 && (
                <>
                  <IconButton
                    onClick={() => setLightboxIndex((current) => current === null ? 0 : (current - 1 + galleryItems.length) % galleryItems.length)}
                    sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.14)', color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                    aria-label="Ảnh trước"
                  >
                    <ArrowBackIosNewRoundedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => setLightboxIndex((current) => current === null ? 0 : (current + 1) % galleryItems.length)}
                    sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.14)', color: '#FFFFFF', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } }}
                    aria-label="Ảnh tiếp"
                  >
                    <ArrowForwardIosRoundedIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
            {galleryItems.length > 1 && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, minmax(0, 1fr))', md: `repeat(${Math.min(galleryItems.length, 6)}, minmax(0, 1fr))` }, gap: 1.25, mt: 2.5 }}>
                {galleryItems.map((item, index) => (
                  <Paper
                    key={`${item.image}-${index}`}
                    onClick={() => setLightboxIndex(index)}
                    sx={{
                      cursor: 'pointer',
                      overflow: 'hidden',
                      borderRadius: '18px',
                      border: '2px solid',
                      borderColor: index === activeImageIndex ? 'primary.main' : 'transparent',
                      opacity: index === activeImageIndex ? 1 : 0.72,
                    }}
                  >
                    <Box component="img" src={item.image} alt={item.altText} sx={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Dialog>
    </Container>
  )
}
