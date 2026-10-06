import { Stack, Typography, FormHelperText } from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { addCalendarDays, overlapsBookedDates, todayInHue, type BookedDateRange } from '../../lib/bookingValidation'

type DateRangePickerProps = {
  checkInDate?: string; checkOutDate?: string
  onCheckInChange: (date: string) => void; onCheckOutChange: (date: string) => void
  bookedDates?: string[]; maxMonths?: number; minDate?: Date
  bookedDateRanges?: BookedDateRange[]
  label?: string; error?: string; hint?: string; disabled?: boolean
}
export function DateRangePicker({ checkInDate, checkOutDate, onCheckInChange, onCheckOutChange,
  bookedDates = [], bookedDateRanges = [], maxMonths, minDate, label, error, hint, disabled }: DateRangePickerProps) {
  const minimum = minDate ? dayjs(minDate).format('YYYY-MM-DD') : todayInHue()
  const maximum = maxMonths ? dayjs(minimum).add(maxMonths, 'month') : undefined
  const booked = new Set(bookedDates)
  const arrival = checkInDate ?? ''
  const [start, setStart] = useState(checkInDate ? dayjs(checkInDate, 'YYYY-MM-DD', true) : null)
  const [end, setEnd] = useState(checkOutDate ? dayjs(checkOutDate, 'YYYY-MM-DD', true) : null)
  useEffect(() => {
    setStart((draft) => checkInDate ? dayjs(checkInDate, 'YYYY-MM-DD', true) : draft && !draft.isValid() ? draft : null)
  }, [checkInDate])
  useEffect(() => {
    setEnd((draft) => checkOutDate ? dayjs(checkOutDate, 'YYYY-MM-DD', true) : draft && !draft.isValid() ? draft : null)
  }, [checkOutDate])
  return <Stack spacing={1}>
    {label && <Typography variant="subtitle2">{label}</Typography>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <DatePicker label="Ngày nhận phòng" format="DD/MM/YYYY" disabled={disabled}
        value={start} minDate={dayjs(minimum)} maxDate={maximum}
        shouldDisableDate={(date) => {
          const day = date.format('YYYY-MM-DD')
          return booked.has(day) || overlapsBookedDates(day, addCalendarDays(day, 1), bookedDateRanges)
        }}
        onChange={(date) => { setStart(date); onCheckInChange(date?.isValid() ? date.format('YYYY-MM-DD') : '') }}
        slotProps={{ textField: { id: 'checkInDate', required: true, error: Boolean(error), fullWidth: true, size: 'medium', helperText: 'Từ ngày' } }} />
      <DatePicker label="Ngày trả phòng" format="DD/MM/YYYY" disabled={disabled}
        value={end}
        minDate={dayjs(checkInDate && dayjs(checkInDate).isValid() ? addCalendarDays(checkInDate, 1) : addCalendarDays(minimum, 1))}
        maxDate={maximum}
        shouldDisableDate={(date) =>
          Boolean(arrival) && ([...booked].some((day) => day >= arrival && day < date.format('YYYY-MM-DD')) ||
            overlapsBookedDates(arrival, date.format('YYYY-MM-DD'), bookedDateRanges))}
        onChange={(date) => { setEnd(date); onCheckOutChange(date?.isValid() ? date.format('YYYY-MM-DD') : '') }}
        slotProps={{ textField: { id: 'checkOutDate', required: true, error: Boolean(error), fullWidth: true, size: 'medium', helperText: 'Đến ngày' } }} />
    </Stack>
    {(error || hint) && <FormHelperText error={Boolean(error)}>{error ?? hint}</FormHelperText>}
  </Stack>
}
