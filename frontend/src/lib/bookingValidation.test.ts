import { describe, expect, it } from 'vitest'
import { addCalendarDays, countNights, isCalendarDate, normalizeCheckout, overlapsBookedDates, todayInHue, validateCheckout, validateStay } from './bookingValidation'

const input = {
  roomId: 'room-1', checkInDate: '2099-03-10', checkOutDate: '2099-03-12', guestCount: 2,
  guestName: 'Nguyễn Minh Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567', note: '',
}
describe('calendar dates and checkout contract', () => {
  it('blocks occupied nights but allows checkout on the next booking arrival and arrival on its checkout', () => {
    const ranges = [{ checkInDate: '2099-03-12', checkOutDate: '2099-03-15' }]
    expect(overlapsBookedDates('2099-03-10', '2099-03-12', ranges)).toBe(false)
    expect(overlapsBookedDates('2099-03-15', '2099-03-17', ranges)).toBe(false)
    expect(overlapsBookedDates('2099-03-10', '2099-03-13', ranges)).toBe(true)
    expect(overlapsBookedDates('2099-03-13', '2099-03-14', ranges)).toBe(true)
    expect(overlapsBookedDates('2099-03-10', '2099-03-17', ranges)).toBe(true)
  })
  it('uses the calendar day in Hue on both sides of UTC midnight', () => {
    expect(todayInHue(new Date('2026-10-05T16:59:00Z'))).toBe('2026-10-05')
    expect(todayInHue(new Date('2026-10-05T17:00:00Z'))).toBe('2026-10-06')
  })
  it.each(['2026-02-30', '2026-13-01', '', '2026-1-01', '2026-10-06T00:00:00Z'])('rejects invalid date %s', (date) => {
    expect(isCalendarDate(date)).toBe(false)
  })
  it('accepts leap day and advances across year boundary', () => {
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('counts nights without local daylight-saving offsets', () => {
    expect(countNights('2026-03-07', '2026-03-10')).toBe(3)
    expect(countNights('2026-10-31', '2026-11-02')).toBe(2)
    expect(countNights('', '2026-11-02')).toBe(0)
    expect(countNights('2026-11-02', '2026-11-01')).toBe(0)
  })
  it('accepts valid checkout with the original API field names', () => {
    expect(validateCheckout(input, 2)).toEqual({})
    expect(Object.keys(normalizeCheckout(input))).toEqual(Object.keys(input))
  })
  it.each([0, -1, 1.5, NaN, Infinity, 3])('rejects invalid capacity %s', (guestCount) => {
    expect(validateCheckout({ ...input, guestCount }, 2).guestCount).toBeTruthy()
  })
  it('rejects past dates, equal dates and reversed dates', () => {
    expect(validateStay({ ...input, checkInDate: '2000-01-01' }).checkInDate).toBeTruthy()
    expect(validateStay({ ...input, checkOutDate: input.checkInDate }).checkOutDate).toBeTruthy()
    expect(validateStay({ ...input, checkOutDate: '2099-03-09' }).checkOutDate).toBeTruthy()
  })
  it.each(['', 'user@', 'user@example', 'a b@example.com'])('rejects invalid email %s', (guestEmail) => {
    expect(validateCheckout({ ...input, guestEmail }, 2).guestEmail).toBeTruthy()
  })
  it('matches backend Vietnam phone rules and length constraints', () => {
    expect(validateCheckout({ ...input, guestPhone: '+84901234567' }, 2)).toEqual({})
    expect(validateCheckout({ ...input, guestPhone: '123456' }, 2).guestPhone).toBeTruthy()
    expect(validateCheckout({ ...input, guestName: ' '.repeat(5) }, 2).guestName).toBeTruthy()
    expect(validateCheckout({ ...input, guestName: 'a'.repeat(151) }, 2).guestName).toBeTruthy()
    expect(validateCheckout({ ...input, note: 'a'.repeat(1001) }, 2).note).toBeTruthy()
    expect(validateCheckout({ ...input, note: 'a'.repeat(1000) }, 2)).toEqual({})
  })
  it('normalizes contacts without changing date-only payloads', () => {
    expect(normalizeCheckout({ ...input, guestName: ' Anh ', guestEmail: ' Anh@Example.com ',
      guestPhone: ' 0901234567 ', note: ' ' })).toEqual({
      ...input, guestName: 'Anh', guestEmail: 'anh@example.com', guestPhone: '0901234567', note: undefined,
    })
  })
})
