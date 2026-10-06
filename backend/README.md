# O ni homstay backend

NestJS backend cho dự án **O ni homstay**.

## Hiện có

- popup auth APIs: register, login, forgot password, reset password
- public room APIs cho trang home và room detail
- TypeORM entities + migrations + repository queries
- seed dữ liệu tự chạy khi database còn trống

## Setup

```bash
npm install
```

Tạo file `.env` từ `.env.example`.

## Database

Mặc định khuyến nghị production/local thật:

- `DB_TYPE=postgres`
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/homestay`

Chạy migration:

```bash
npm run migration:run
```

Nếu chưa dựng PostgreSQL, backend vẫn có thể chạy local với:

```env
DB_TYPE=sqljs
```

## Run

```bash
npm run start:dev
```

Base API: `http://localhost:3000/api/v1`

## TypeORM scripts

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

## Public endpoints đang dùng bởi frontend

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /rooms`
- `GET /rooms/availability`
- `GET /rooms/:slug`

Room detail also returns `bookedDateRanges` with date-only `checkInDate` and
`checkOutDate`. No guest or payment identifiers are exposed by this calendar
data. These half-open intervals share the same blocking rules as the final
booking overlap check, including pending-hold expiry and cancelled/refunded
bookings. Calendar data is advisory: booking creation always rechecks availability.

## Tests

```bash
npm run test:e2e
```
