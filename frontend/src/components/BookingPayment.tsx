import { useEffect, useState } from 'react'
import { Alert, Box, Paper, Stack, Typography } from '@mui/material'
import QRCode from 'qrcode'
import type { BookingPaymentStatus } from '../lib/publicApi'
import { bookingStatusLabels, paymentStatusLabels, isPaymentPending, safeWebUrl } from '../lib/bookingPayment'
import { formatCurrency } from '../lib/format'
import { Badge, Button } from './ui'

export function BookingPayment({ status, email, pollingError, onRefresh }: {
  status: BookingPaymentStatus; email: string; pollingError: string | null; onRefresh: () => void
}) {
  const [qr, setQr] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const [now, setNow] = useState(Date.now())
  const pending = isPaymentPending(status)
  const expiry = status.expiresAt ? Date.parse(status.expiresAt) : null
  const remaining = expiry !== null ? Math.max(0, Math.ceil((expiry - now) / 1000)) : null
  const expired = remaining === 0 && pending
  const checkoutUrl = safeWebUrl(status.payment.checkoutUrl)
  useEffect(() => {
    let active = true
    setQr(null); setQrError(false)
    const value = status.payment.qrCodeUrl
    if (!value) return
    const imageUrl = safeWebUrl(value)
    if (imageUrl) setQr(imageUrl)
    else {
      // PayOS returns EMV QR content, not an image URL. Encode it locally.
      QRCode.toDataURL(value, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
        .then((image) => { if (active) setQr(image) })
        .catch(() => { if (active) setQrError(true) })
    }
    return () => { active = false }
  }, [status.payment.qrCodeUrl])
  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [pending])
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: '16px', bgcolor: '#FFFEFC', borderColor: 'divider' }}>
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Box>
          <Typography variant="overline" color="primary">Bước 3 · Thanh toán</Typography>
          <Typography variant="h5" component="h2">Thanh toán đặt phòng</Typography>
        </Box>
        <Badge variant={status.status === 'CONFIRMED' ? 'success' : 'primary'}>{bookingStatusLabels[status.status] ?? status.status}</Badge>
      </Stack>
      <Typography>Mã đặt phòng: <strong>{status.bookingCode}</strong></Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" aria-live="polite">
        <Badge variant={status.paymentStatus === 'PAID' ? 'success' : status.paymentStatus === 'PENDING' ? 'warning' : 'danger'}>
          {paymentStatusLabels[status.paymentStatus] ?? status.paymentStatus}
        </Badge>
      </Stack>
      <Typography variant="h5" fontWeight={700} color="primary.dark">{formatCurrency(status.totalAmount)}</Typography>
      {status.paymentStatus === 'PAID' && <Alert severity="success">
        Đặt phòng {status.bookingCode} đã được thanh toán. Vui lòng kiểm tra email {email} để xem thông tin xác nhận.
      </Alert>}
      {pending && !expired && <>
        <Typography color="text.secondary" textAlign="center">Mở ứng dụng ngân hàng và quét mã để thanh toán. Trạng thái đơn sẽ tự cập nhật.</Typography>
        {qr && !qrError && <Box component="img" src={qr} alt={`Mã QR thanh toán cho đơn ${status.bookingCode}`}
          onError={() => setQrError(true)} sx={{ width: { xs: 220, sm: 240 }, height: { xs: 220, sm: 240 }, alignSelf: 'center', objectFit: 'contain', p: 1, border: '1px solid', borderColor: 'divider', borderRadius: '12px', bgcolor: '#FFFFFF' }} />}
        {qrError && <Alert severity="warning">Không thể hiển thị mã QR. Vui lòng mở trang thanh toán bên dưới.</Alert>}
        {!status.payment.qrCodeUrl && !checkoutUrl && <Alert severity="warning">Đơn chưa có thông tin thanh toán. Vui lòng kiểm tra lại trạng thái.</Alert>}
        {remaining !== null && <Typography role="timer" textAlign="center">
          Thời gian giữ phòng còn lại: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </Typography>}
        {status.expiresAt && <Typography variant="body2" color="text.secondary">
          Hạn thanh toán: {new Date(status.expiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam)
        </Typography>}
        {checkoutUrl && <Button fullWidth variant="primary" href={checkoutUrl} target="_blank" rel="noopener noreferrer">Mở trang thanh toán</Button>}
      </>}
      {expired && <Alert severity="warning">Đã hết thời gian giữ phòng. Vui lòng kiểm tra trạng thái trước khi đặt lại.</Alert>}
      {['FAILED', 'EXPIRED', 'REFUNDED'].includes(status.paymentStatus) && <Alert severity="warning">
        {paymentStatusLabels[status.paymentStatus]}. Đơn này không còn chờ thanh toán.
      </Alert>}
      {pollingError && <Alert severity="warning" action={<Button variant="ghost" color="inherit" onClick={onRefresh}>Thử lại</Button>}>
        {pollingError}
      </Alert>}
      <Button fullWidth variant="outline" onClick={onRefresh}>Kiểm tra trạng thái thanh toán</Button>
    </Stack>
  </Paper>
}
