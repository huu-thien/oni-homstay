import type { CheckoutInput } from './bookingValidation'
import type { BookingCheckoutResponse, BookingDetail, BookingPaymentStatus, PublicRoomDetail } from './publicApi'

export function checkoutToDetail(response: BookingCheckoutResponse, input: CheckoutInput, room: PublicRoomDetail): BookingDetail {
  return {
    id: response.bookingId, bookingCode: response.bookingCode, roomId: input.roomId,
    roomName: room.name, roomSlug: room.slug, guestName: input.guestName,
    guestEmail: input.guestEmail, guestPhone: input.guestPhone,
    checkInDate: input.checkInDate, checkOutDate: input.checkOutDate, guestCount: input.guestCount,
    roomPriceSnapshot: response.roomPriceSnapshot, totalAmount: response.totalAmount,
    status: response.status, paymentStatus: response.payment.status, note: input.note ?? null,
    holdExpiresAt: response.expiresAt, confirmedAt: null,
    payment: { ...response.payment, paidAt: null },
  }
}

export function detailToPaymentStatus(detail: BookingDetail): BookingPaymentStatus | null {
  if (!detail.payment) return null
  return {
    bookingId: detail.id, bookingCode: detail.bookingCode, roomName: detail.roomName,
    roomSlug: detail.roomSlug, status: detail.status, paymentStatus: detail.paymentStatus,
    totalAmount: detail.totalAmount, expiresAt: detail.holdExpiresAt ?? detail.payment.expiresAt,
    confirmedAt: detail.confirmedAt, payment: { ...detail.payment },
  }
}

export function isPaymentPending(status: BookingPaymentStatus): boolean {
  return status.status === 'PENDING_PAYMENT' && status.paymentStatus === 'PENDING' && status.payment.status === 'PENDING'
}

export function safeWebUrl(value: string | null): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch { return undefined }
}

export const bookingStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', CHECKED_IN: 'Đã nhận phòng',
  CHECKED_OUT: 'Đã trả phòng', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền',
}
export const paymentStatusLabels: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', FAILED: 'Thanh toán thất bại',
  EXPIRED: 'Đã hết hạn', REFUNDED: 'Đã hoàn tiền',
}
