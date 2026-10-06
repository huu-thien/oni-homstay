# Booking UI

The booking page uses Material UI 6 and Vietnamese MUI X Date Pickers.
The old hand-built calendar, fixed sample dates, placeholder QR and simulated
payment button have been removed.

## Flow

1. Select arrival, departure and guest count. The API checks the whole stay;
   it does not expose hourly slots or a calendar of booked days.
2. Enter contact information. Validation runs before any booking request.
3. Availability is rechecked, then guest checkout creates a held order.
4. The order code is saved in the URL. Contact/stay fields are locked.
5. Scan the actual QR or open the gateway. Sequential polling reads backend
   status; a redirect alone never marks an order as paid.

`BookingPayment` supports both QR image URLs and locally encoded PayOS EMV
content, a real expiry countdown, explicit error/retry feedback and terminal
payment states. Restored orders retain their original price snapshot.

## Layout and accessibility

- One column on mobile, form and sticky summary on desktop.
- Date-picker dialog and keyboard controls provided by MUI.
- Associated labels, field errors, autocomplete, step labels and textual status.
- Accessible touch targets, skip navigation, focus styles and reduced motion.
- Helper text remains readable even after the checkout form is locked.

## Regression checks

`npm test` covers invalid dates, capacity, contact fields, API payloads,
availability failure, restore errors, server price snapshots and duplicate
submission prevention. `npm run test:e2e` checks real browser checkout and
390/768/1440 px layouts with axe-core WCAG checks.

Production payment and email still require live backend/provider verification.
