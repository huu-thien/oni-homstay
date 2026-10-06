# O Ni Homestay frontend

React 19, TypeScript and Vite frontend for the Hue homestay booking system.
The interface uses Material UI 6, MUI X Date Pickers, Day.js and Emotion.
MUI X Charts provides administration analytics.

## Running

```powershell
npm install
npm run dev
npm run build
npm run lint
npm test
```

Set `VITE_API_BASE_URL` using `.env.example`. Production must point to the deployed
NestJS API and use a configured PayOS provider. The frontend does not simulate
payment completion; only backend status responses confirm payment.

Browser regression tests run the production build with isolated API fixtures,
not a live payment provider. The browser timezone is deliberately set to
America/Los_Angeles to catch accidental date conversion:

```powershell
npx playwright install chromium
npm run test:e2e
```

On Windows with Microsoft Edge installed, downloading Chromium is unnecessary:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

## Design system

`src/theme.ts` defines the forest-green / terracotta / ivory palette, typography, shape,
focus visibility, touch targets and reduced-motion behavior. `main.tsx` installs
`ThemeProvider`, `CssBaseline`, and Vietnamese date-picker localization.
Use MUI components and theme-based `sx` instead of Tailwind or independent CSS.
Admin, room detail and booking routes are lazy-loaded.
Inputs and selects use the standard MUI medium size with white surfaces; status
badges use pill shapes and localized labels. Admin sections use tabs, short
paginated tables, and filter dialogs instead of a vertically scrolling page.
Dialog content and wide tables remain independently navigable.

## Module responsibilities

| Module | Responsibility |
| --- | --- |
| `pages/HomePage.tsx` | Catalog, availability search, loading/error/empty states |
| `pages/RoomDetailPage.tsx` | Gallery, amenities, policies and date-preserving booking links |
| `pages/BookingPage.tsx` | Checkout form, availability recheck, order restoration and payment polling |
| `components/BookingPayment.tsx` | Real QR, countdown, gateway link and backend payment state |
| `lib/bookingValidation.ts` | Date-only arithmetic, contact validation, capacity and payload normalization |
| `lib/bookingPayment.ts` | Price-preserving payment mappings and safe gateway URLs |
| `pages/AdminDashboardPage.tsx` | Analytics and room, amenity, booking and user management |
| `lib/publicApi.ts`, `lib/adminApi.ts` | Existing API contracts and request serialization |

## Booking invariants

- Send dates as `YYYY-MM-DD`, never `toISOString()` or browser-local midnight.
- "Today" is the calendar date in `Asia/Ho_Chi_Minh`. Date arithmetic is independent
  of daylight-saving transitions in a visitor's timezone.
- Validate real dates, checkout after check-in, non-past arrivals, integer guest
  count within capacity, name length, email, Vietnam phone format and note length.
- Availability is checked for the selected interval and again before checkout.
  The backend remains responsible for concurrency and overbooking prevention.
- Preserve `checkInDate`, `checkOutDate` and `guestCount` through catalog links.
- Save the booking code in the URL immediately after creation. Lock the form
  while an order exists, preventing accidental duplicate checkout.
- Use server `roomPriceSnapshot` and `totalAmount`, including when restoring an
  order after room prices change. A return URL does not prove payment.
- Poll sequentially, surface network failures and retry without discarding the
  existing order. Stop automatic polling for terminal booking/payment states.
- PayOS `qrCodeUrl` may contain EMV text. Encode it locally with `qrcode`; do not
  treat raw QR text as an image URL or forward it to a third-party QR service.
- Room detail includes `bookedDateRanges` from the backend. Room-specific pickers
  disable occupied nights and stays that cross a booking. Intervals are half-open:
  checkout on another booking's check-in and arrival on its checkout are allowed.
  Cancelled/refunded bookings and expired pending holds do not block dates.
  The general home search has no selected room and checks interval availability
  rather than disabling a date that may still be free in another room.
  No TimePicker is shown without a backend time-slot contract.

## Verification boundaries

Vitest covers validation, mapping, public API serialization and public/admin
interactions. Playwright exercises actual date pickers, checkout payloads,
mobile/tablet/desktop overflow and automated WCAG checks with axe-core.
Fixtures live only in test files and are excluded from application bundles.

These checks do not replace live database/payment/webhook/email integration,
manual screen-reader testing, or physical-device checks before deployment.
