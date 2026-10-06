import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Box, Breadcrumbs, Container, Divider, MenuItem, Paper, Skeleton, Stack,
  Step, StepLabel, Stepper, TextField, Typography } from '@mui/material'
import type { AuthMode } from '../components/AuthModal'
import { BookingPayment } from '../components/BookingPayment'
import { Badge, Button, DateRangePicker } from '../components/ui'
import { useToast } from '../components/useToast'
import { ApiError } from '../lib/api'
import { addCalendarDays, countNights, normalizeCheckout, overlapsBookedDates, todayInHue, validateCheckout, validateStay } from '../lib/bookingValidation'
import { checkoutToDetail, detailToPaymentStatus, isPaymentPending } from '../lib/bookingPayment'
import type { CustomerSession } from '../lib/customerAuth'
import { formatCurrency } from '../lib/format'
import { checkRoomAvailability, createGuestCheckoutBooking, fetchBookingByCode, fetchBookingPaymentStatus,
  fetchRoomDetail, type BookingDetail, type BookingPaymentStatus, type PublicRoomDetail } from '../lib/publicApi'

type Availability = { key: string; state: 'checking' | 'available' | 'unavailable' | 'error'; message: string }
type BookingPageProps = { onOpenAuth: (mode: AuthMode) => void; customerSession: CustomerSession | null }
const errorText = (error: unknown, fallback: string) => error instanceof ApiError ? error.message : fallback

export function BookingPage({ onOpenAuth, customerSession }: BookingPageProps) {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const bookingCode = searchParams.get('bookingCode')
  const toast = useToast()
  const [room, setRoom] = useState<PublicRoomDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(Boolean(bookingCode))
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreVersion, setRestoreVersion] = useState(0)
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [payment, setPayment] = useState<BookingPaymentStatus | null>(null)
  const [pollingError, setPollingError] = useState<string | null>(null)
  const [pollVersion, setPollVersion] = useState(0)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkInDate, setCheckIn] = useState(searchParams.get('checkInDate') ?? todayInHue())
  const [checkOutDate, setCheckOut] = useState(searchParams.get('checkOutDate') ?? addCalendarDays(todayInHue(), 1))
  const [guestCount, setGuestCount] = useState(Number(searchParams.get('guestCount') ?? 1))
  const [guestName, setGuestName] = useState(customerSession?.user.fullName ?? '')
  const [guestEmail, setGuestEmail] = useState(customerSession?.user.email ?? '')
  const [guestPhone, setGuestPhone] = useState(customerSession?.user.phone ?? '')
  const [note, setNote] = useState('')
  const createdCode = useRef<string | null>(null)
  const submitting = useRef(false)
  const bookingId = booking?.id
  const stay = { checkInDate, checkOutDate, guestCount }
  const stayErrors = validateStay(stay, room?.maxGuests)
  if (!booking && !bookingCode && overlapsBookedDates(checkInDate, checkOutDate, room?.bookedDateRanges)) {
    stayErrors.checkOutDate = 'Khoảng ngày này đã có người đặt. Vui lòng chọn ngày khác.'
  }
  const stayValid = Object.keys(stayErrors).length === 0
  const availabilityKey = JSON.stringify([room?.id, checkInDate, checkOutDate, guestCount])
  const locked = Boolean(booking) || isSubmitting || isRestoring || Boolean(bookingCode)
  function clearFieldErrors(...fields: string[]) {
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !fields.includes(key))))
    setError(null)
  }

  useEffect(() => {
    if (!customerSession) return
    setGuestName((current) => current || customerSession.user.fullName)
    setGuestEmail((current) => current || customerSession.user.email)
    setGuestPhone((current) => current || customerSession.user.phone)
  }, [customerSession])

  useEffect(() => {
    let active = true
    setIsLoading(true); setLoadError(null); setRoom(null)
    fetchRoomDetail(slug ?? '')
      .then((data) => { if (active) setRoom(data) })
      .catch((err: unknown) => { if (active) setLoadError(errorText(err, 'Không thể tải phòng. Vui lòng thử lại.')) })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!bookingCode) {
      setIsRestoring(false); setBooking(null); setPayment(null); createdCode.current = null
      return
    }
    if (createdCode.current === bookingCode) { setIsRestoring(false); return }
    let active = true
    setIsRestoring(true); setRestoreError(null); setBooking(null); setPayment(null)
    fetchBookingByCode(bookingCode).then((detail) => {
      if (!active) return
      if (detail.roomSlug !== slug) {
        setRestoreError('Mã đặt phòng không thuộc phòng đang xem. Vui lòng mở đúng liên kết xác nhận.')
        return
      }
      setBooking(detail); setPayment(detailToPaymentStatus(detail))
      setCheckIn(detail.checkInDate); setCheckOut(detail.checkOutDate); setGuestCount(detail.guestCount)
      setGuestName(detail.guestName); setGuestEmail(detail.guestEmail ?? ''); setGuestPhone(detail.guestPhone ?? '')
      setNote(detail.note ?? '')
    }).catch((err: unknown) => {
      if (active) setRestoreError(errorText(err, 'Không thể khôi phục đơn đặt phòng. Vui lòng thử lại.'))
    }).finally(() => { if (active) setIsRestoring(false) })
    return () => { active = false }
  }, [bookingCode, slug, restoreVersion])

  useEffect(() => {
    if (!room || !stayValid || booking || bookingCode) return
    let active = true
    setAvailability({ key: availabilityKey, state: 'checking', message: 'Đang kiểm tra phòng trống…' })
    const timeout = window.setTimeout(() => {
      checkRoomAvailability({ checkInDate, checkOutDate, guestCount }).then((items) => {
        if (!active) return
        const available = items.some((item) => item.roomId === room.id && item.available)
        setAvailability({ key: availabilityKey, state: available ? 'available' : 'unavailable',
          message: available ? 'Phòng còn trống trong khoảng ngày bạn chọn.' : 'Phòng không còn trống. Vui lòng chọn ngày khác.' })
      }).catch((err: unknown) => {
        if (active) setAvailability({ key: availabilityKey, state: 'error',
          message: errorText(err, 'Không thể kiểm tra phòng trống. Vui lòng thử lại.') })
      })
    }, 350)
    return () => { active = false; window.clearTimeout(timeout) }
  }, [room, stayValid, checkInDate, checkOutDate, guestCount, availabilityKey, booking, bookingCode, restoreVersion])

  useEffect(() => {
    if (!bookingId) return
    const id = bookingId
    let active = true
    let timer: number | undefined
    async function refresh() {
      try {
        const next = await fetchBookingPaymentStatus(id)
        if (!active) return
        setPayment(next); setPollingError(null)
        if (isPaymentPending(next)) timer = window.setTimeout(() => { void refresh() }, 5000)
      } catch (err) {
        if (!active) return
        setPollingError(errorText(err, 'Chưa thể cập nhật thanh toán. Đơn của bạn vẫn được lưu; hệ thống sẽ thử lại.'))
        timer = window.setTimeout(() => { void refresh() }, 10000)
      }
    }
    void refresh()
    return () => { active = false; window.clearTimeout(timer) }
  }, [bookingId, pollVersion])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!room || locked || submitting.current) return
    const input = normalizeCheckout({ roomId: room.id, ...stay, guestName, guestEmail, guestPhone, note })
    const validation = validateCheckout(input, room.maxGuests)
    if (overlapsBookedDates(checkInDate, checkOutDate, room.bookedDateRanges)) {
      validation.checkOutDate = 'Khoảng ngày này đã có người đặt. Vui lòng chọn ngày khác.'
    }
    setErrors(validation); setError(null)
    if (Object.keys(validation).length) {
      document.getElementById(Object.keys(validation)[0])?.focus()
      return
    }
    submitting.current = true; setIsSubmitting(true)
    try {
      const items = await checkRoomAvailability(stay)
      if (!items.some((item) => item.roomId === room.id && item.available)) {
        setAvailability({ key: availabilityKey, state: 'unavailable', message: 'Phòng vừa được đặt. Vui lòng chọn ngày khác.' })
        return
      }
      const response = await createGuestCheckoutBooking(input)
      const detail = checkoutToDetail(response, input, room)
      createdCode.current = response.bookingCode
      setBooking(detail); setPayment(detailToPaymentStatus(detail))
      setGuestName(input.guestName); setGuestEmail(input.guestEmail); setGuestPhone(input.guestPhone)
      const params = new URLSearchParams(searchParams)
      params.set('bookingCode', response.bookingCode)
      setSearchParams(params, { replace: true })
      toast.success('Đã giữ phòng. Vui lòng hoàn tất thanh toán để xác nhận.')
    } catch (err) {
      const message = errorText(err, 'Không thể tạo đơn đặt phòng. Vui lòng thử lại.')
      setError(message); toast.error(message)
    } finally { submitting.current = false; setIsSubmitting(false) }
  }

  function startNew() {
    createdCode.current = null
    setBooking(null); setPayment(null); setRestoreError(null); setPollingError(null); setError(null)
    setCheckIn(todayInHue()); setCheckOut(addCalendarDays(todayInHue(), 1))
    const params = new URLSearchParams(searchParams); params.delete('bookingCode'); params.delete('payment')
    setSearchParams(params, { replace: true })
  }
  if (isLoading) return <Container component="main" sx={{ py: 5 }} aria-label="Đang tải phòng" aria-busy="true"><Skeleton variant="rounded" height={480} sx={{ borderRadius: '20px' }} /></Container>
  if (!room) return <Container component="main" sx={{ py: 5 }}>
    <Alert severity="error">{loadError ?? 'Không tìm thấy phòng.'}</Alert>
    <Button component={Link} to="/" sx={{ mt: 2 }} variant="primary">Quay về trang chủ</Button>
  </Container>
  const nights = countNights(checkInDate, checkOutDate)
  const price = booking?.roomPriceSnapshot ?? room.pricePerNight
  const total = payment?.totalAmount ?? booking?.totalAmount ?? price * nights
  const confirmed = payment?.paymentStatus === 'PAID'
  const canCreate = !locked && stayValid && availability?.key === availabilityKey && availability.state === 'available'
  const terminal = payment && !isPaymentPending(payment) && !confirmed
  return <Container component="main" sx={{ py: { xs: 3, md: 5 } }}>
    <Breadcrumbs aria-label="Đường dẫn" sx={{ mb: 3 }}>
      <Button component={Link} to="/" variant="ghost">Trang chủ</Button>
      <Button component={Link} to={`/rooms/${room.slug}`} variant="ghost">{room.name}</Button><Typography>Đặt phòng</Typography>
    </Breadcrumbs>
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      <Badge variant="primary" sx={{ alignSelf: 'flex-start' }}>Đặt phòng trực tiếp</Badge>
      <Typography variant="h1">Đặt phòng tại {room.name}</Typography>
    </Stack>
    <Stepper activeStep={confirmed ? 3 : booking ? 2 : 0} alternativeLabel sx={{ mb: 4, bgcolor: 'rgba(255,255,255,0.75)', p: 2, borderRadius: '16px' }}>
      {['Chọn ngày', 'Thông tin liên hệ', 'Thanh toán'].map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
    </Stepper>
    {isRestoring && <Alert severity="info" sx={{ mb: 3 }}>Đang khôi phục đơn đặt phòng…</Alert>}
    {restoreError && <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" variant="ghost" onClick={() => setRestoreVersion((v) => v + 1)}>Thử lại</Button>}>
      {restoreError}
    </Alert>}
    <Box component="form" noValidate onSubmit={submit} sx={{ display: 'grid', gap: 3, alignItems: 'start',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.35fr) minmax(0, 1fr)' } }}>
      <Stack spacing={3} sx={{ minWidth: 0 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.92)' }}><Stack spacing={3}>
          <Typography variant="h5" component="h2">Chọn ngày lưu trú</Typography>
          <DateRangePicker checkInDate={checkInDate} checkOutDate={checkOutDate}
            bookedDateRanges={room.bookedDateRanges}
            onCheckInChange={(value) => { setCheckIn(value); clearFieldErrors('checkInDate', 'checkOutDate') }}
            onCheckOutChange={(value) => { setCheckOut(value); clearFieldErrors('checkOutDate') }} disabled={locked}
            error={!booking ? errors.checkInDate ?? errors.checkOutDate ?? stayErrors.checkInDate ?? stayErrors.checkOutDate : undefined}
            hint="Ngày lưu trú tính theo lịch tại Huế (UTC+7), không chuyển đổi sang giờ UTC." />
          <TextField id="guestCount" label="Số khách" select
            value={Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= room.maxGuests ? guestCount : ''}
            disabled={locked} required
            onChange={(event) => { setGuestCount(Number(event.target.value)); clearFieldErrors('guestCount') }}
            error={Boolean(errors.guestCount ?? stayErrors.guestCount)}
            helperText={!booking ? errors.guestCount ?? stayErrors.guestCount : undefined}>
            {Array.from({ length: room.maxGuests }, (_, index) => <MenuItem key={index + 1} value={index + 1}>{index + 1} khách</MenuItem>)}
          </TextField>
          {!booking && stayValid && availability?.key === availabilityKey && <Alert
            severity={availability.state === 'available' ? 'success' : availability.state === 'checking' ? 'info' : 'warning'}
            action={availability.state === 'error' ? <Button color="inherit" variant="ghost" onClick={() => setRestoreVersion((v) => v + 1)}>Thử lại</Button> : undefined}>
            {availability.message}
          </Alert>}
        </Stack></Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.92)' }}><Stack spacing={3}>
          <Typography variant="h5" component="h2">Thông tin liên hệ</Typography>
          <TextField id="guestName" label="Họ và tên" required autoComplete="name" value={guestName}
            disabled={locked} onChange={(event) => { setGuestName(event.target.value); clearFieldErrors('guestName') }} error={Boolean(errors.guestName)}
            helperText={errors.guestName} slotProps={{ htmlInput: { maxLength: 150 } }} />
          <TextField id="guestEmail" label="Email nhận xác nhận" type="email" required autoComplete="email"
            value={guestEmail} disabled={locked} onChange={(event) => { setGuestEmail(event.target.value); clearFieldErrors('guestEmail') }}
            error={Boolean(errors.guestEmail)} helperText={errors.guestEmail} />
          <TextField id="guestPhone" label="Số điện thoại" type="tel" required autoComplete="tel" value={guestPhone}
            disabled={locked} onChange={(event) => { setGuestPhone(event.target.value); clearFieldErrors('guestPhone') }}
            error={Boolean(errors.guestPhone)} helperText={errors.guestPhone ?? 'Ví dụ: 0901234567 hoặc +84901234567'} />
          <TextField id="note" label="Ghi chú (không bắt buộc)" multiline minRows={3} value={note}
            disabled={locked} onChange={(event) => { setNote(event.target.value); clearFieldErrors('note') }} error={Boolean(errors.note)}
            helperText={errors.note ?? `${note.length}/1.000 ký tự`} slotProps={{ htmlInput: { maxLength: 1000 } }} />
          {!booking && <Alert severity="info">Không cần đăng nhập để đặt phòng. Thông tin tài khoản và xác nhận được gửi qua email sau thanh toán.</Alert>}
        </Stack></Paper>
        {booking && !payment && <Alert severity="warning">Đơn {booking.bookingCode} chưa có thông tin thanh toán.
          <Button variant="ghost" onClick={() => setRestoreVersion((v) => v + 1)}>Tải lại đơn</Button>
        </Alert>}
      </Stack>
      <Paper component="aside" variant="outlined" sx={{ p: 3, position: { md: 'sticky' }, top: { md: 100 }, minWidth: 0 }}>
        <Stack spacing={2}>
          {room.heroImage && <Box component="img" src={room.heroImage} alt={room.name} sx={{ height: 200, width: '100%', objectFit: 'cover', borderRadius: '12px' }} />}
          <Typography variant="h5" component="h2">{room.name}</Typography>
          <Typography color="text.secondary">{room.shortDescription}</Typography>
          <Stack direction="row" justifyContent="space-between"><Typography>Số đêm</Typography><Typography>{nights} đêm</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography>Giá mỗi đêm</Typography><Typography>{formatCurrency(price)}</Typography></Stack>
          <Stack direction="row" justifyContent="space-between"><Typography>Số khách</Typography><Typography>{guestCount} khách</Typography></Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between" gap={2}><Typography fontWeight={700}>Tổng thanh toán</Typography>
            <Typography fontWeight={700} color="primary">{formatCurrency(total)}</Typography></Stack>
          {payment && <BookingPayment status={payment} email={guestEmail} pollingError={pollingError}
            onRefresh={() => setPollVersion((v) => v + 1)} />}
          {!booking && <Typography variant="caption" color="text.secondary">Giá được chốt khi tạo đơn đặt phòng.</Typography>}
          {error && <Alert severity="error">{error}</Alert>}
          {!booking && !bookingCode && <Button type="submit" variant="primary" size="lg" disabled={!canCreate} aria-busy={isSubmitting}>
            {isSubmitting ? 'Đang giữ phòng…' : 'Xác nhận và thanh toán'}
          </Button>}
          {(terminal || restoreError) && <Button variant="outline" onClick={startNew}>Bắt đầu đặt phòng mới</Button>}
          {!customerSession && !booking && <Button variant="outline" onClick={() => onOpenAuth('login')}>Đăng nhập để điền nhanh thông tin</Button>}
          <Divider /><Typography variant="subtitle1" fontWeight={700}>Tiện nghi phòng</Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>{room.amenities.map((amenity) => <Badge key={amenity} variant="default">{amenity}</Badge>)}</Stack>
        </Stack>
      </Paper>
    </Box>
  </Container>
}
