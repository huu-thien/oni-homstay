import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isEmail from 'validator/lib/isEmail'

dayjs.extend(customParseFormat)

export function todayInHue(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function isCalendarDate(value: string): boolean {
  return dayjs(value, 'YYYY-MM-DD', true).isValid()
}

export function addCalendarDays(date: string, days: number): string {
  return dayjs(date, 'YYYY-MM-DD', true).add(days, 'day').format('YYYY-MM-DD')
}

export function countNights(start: string, end: string): number {
  if (!isCalendarDate(start) || !isCalendarDate(end)) return 0
  // UTC is only used for arithmetic; payloads remain calendar dates, not instants.
  return Math.max(0, (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000)
}

export type StayInput = { checkInDate: string; checkOutDate: string; guestCount: number }
export type BookedDateRange = Pick<StayInput, 'checkInDate' | 'checkOutDate'>

export function overlapsBookedDates(start: string, end: string, ranges: BookedDateRange[] = []): boolean {
  return isCalendarDate(start) && isCalendarDate(end) &&
    ranges.some((range) => start < range.checkOutDate && end > range.checkInDate)
}
export type CheckoutInput = StayInput & {
  roomId: string; guestName: string; guestEmail: string; guestPhone: string; note?: string
}

export function validateStay(input: StayInput, maxGuests?: number): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!isCalendarDate(input.checkInDate)) errors.checkInDate = 'Ngày nhận phòng không hợp lệ.'
  else if (input.checkInDate < todayInHue()) errors.checkInDate = 'Vui lòng chọn ngày nhận phòng từ hôm nay.'
  if (!isCalendarDate(input.checkOutDate)) errors.checkOutDate = 'Ngày trả phòng không hợp lệ.'
  else if (isCalendarDate(input.checkInDate) && input.checkOutDate <= input.checkInDate) {
    errors.checkOutDate = 'Ngày trả phòng phải sau ngày nhận phòng.'
  }
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1 ||
      (maxGuests !== undefined && input.guestCount > maxGuests)) {
    errors.guestCount = maxGuests ? `Số khách phải từ 1 đến ${maxGuests}.` : 'Số khách phải là số nguyên dương.'
  }
  return errors
}

export function normalizeCheckout(input: CheckoutInput): CheckoutInput {
  return { ...input, guestName: input.guestName.trim(), guestEmail: input.guestEmail.trim().toLowerCase(),
    guestPhone: input.guestPhone.trim(), note: input.note?.trim() || undefined }
}

export function validateCheckout(input: CheckoutInput, maxGuests: number): Record<string, string> {
  const errors = validateStay(input, maxGuests)
  if (!input.roomId) errors.roomId = 'Vui lòng chọn phòng.'
  if (!input.guestName.trim() || input.guestName.trim().length > 150) errors.guestName = 'Họ tên cần từ 1 đến 150 ký tự.'
  if (!isEmail(input.guestEmail.trim())) errors.guestEmail = 'Vui lòng nhập email hợp lệ.'
  if (!/^(0|\+84)[0-9]{9,10}$/.test(input.guestPhone.trim())) errors.guestPhone = 'Nhập số điện thoại Việt Nam bắt đầu bằng 0 hoặc +84.'
  if ((input.note?.trim().length ?? 0) > 1000) errors.note = 'Ghi chú không được vượt quá 1.000 ký tự.'
  return errors
}
