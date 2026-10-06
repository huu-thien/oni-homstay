# 09 - Screen API Mapping

## 1. Mục tiêu
Tài liệu này map rõ:
- màn hình nào dùng API nào
- request params/body là gì
- response nào được UI consume
- field UI nào map vào DB/API nào

Mục đích:
- giúp FE/BE implement song song
- giảm lệch giữa UI, API spec và DDL
- dùng như checklist trước khi code backend thật

---

## 2. Public screens

### 2.1 Home page

#### UI blocks
- hero + booking search
- danh sách phòng nổi bật
- section tiện nghi chung

#### APIs cần dùng
1. `GET /rooms`
2. `GET /rooms/availability`

#### Request

**A. Load featured rooms**
```http
GET /api/v1/rooms?page=1&limit=6
```

**B. Search availability**
```http
GET /api/v1/rooms/availability?checkInDate=2026-07-26&checkOutDate=2026-07-28&guestCount=2
```

#### Response fields UI dùng

| UI field | Response field |
|---|---|
| tên phòng | `name` |
| loại phòng | `roomType` |
| mô tả ngắn | `shortDescription` |
| giá mỗi đêm | `pricePerNight` |
| sức chứa | `maxGuests` |
| ảnh card | `coverImage.url` hoặc `coverImageUrl` |
| tiện nghi nổi bật | `amenities[]` |
| tổng tiền khi search | `totalAmount` |

---

### 2.2 Room detail page

#### APIs cần dùng
1. `GET /rooms/:slug`
2. `GET /rooms/availability` nếu cần refresh giá theo ngày chọn

#### Request
```http
GET /api/v1/rooms/garden-suite
```

#### Response fields UI dùng

| UI field | Response field |
|---|---|
| title | `name` |
| subtitle | `shortDescription` |
| mô tả dài | `description` |
| room type | `roomType` |
| giá | `pricePerNight` |
| số khách | `maxGuests` |
| số giường/phòng tắm | `bedCount`, `bathroomCount` |
| diện tích | `sizeSqm` |
| gallery | `images[]` |
| cover image | `images[isCover=true]` |
| tiện nghi | `amenities[]` |

---

### 2.3 Booking page

#### APIs cần dùng
1. `GET /rooms/:slug`
2. `POST /bookings/guest-checkout`
3. `GET /payments/:bookingId/status`
4. `GET /bookings/code/:bookingCode`

Frontend production không gọi endpoint hoàn tất thanh toán giả lập.
`qrCodeUrl` của PayOS có thể là chuỗi EMV: frontend tạo ảnh QR cục bộ thay vì
dùng chuỗi đó làm URL ảnh. Các field của request/response không thay đổi.
`payment=return` hoặc `payment=paid` trên URL không xác nhận thanh toán;
frontend luôn đọc trạng thái thật từ API.

#### Request body
```json
{
  "roomId": "uuid",
  "checkInDate": "2026-07-26",
  "checkOutDate": "2026-07-28",
  "guestCount": 2,
  "guestName": "Nguyen Minh Anh",
  "guestEmail": "minhanh@gmail.com",
  "guestPhone": "0909123456",
  "note": "Check-in muon"
}
```

#### Response UI dùng
```json
{
  "bookingId": "uuid",
  "bookingCode": "ONI260724AB12",
  "bookingSource": "GUEST_CHECKOUT",
  "status": "PENDING_PAYMENT",
  "roomPriceSnapshot": 980000,
  "totalAmount": 1960000,
  "expiresAt": "2026-07-24T09:00:00.000Z",
  "payment": {
    "paymentId": "uuid",
    "provider": "MOCKPAY",
    "providerOrderId": "MOCKPAY-6f48...",
    "checkoutUrl": "http://localhost:3000/api/v1/payments/mock/uuid/checkout",
    "qrCodeUrl": "https://api.qrserver.com/...",
    "status": "PENDING",
    "expiresAt": "2026-07-24T09:00:00.000Z"
  }
}
```

#### Payment status response UI dùng
```json
{
  "bookingId": "uuid",
  "bookingCode": "ONI260724AB12",
  "roomName": "Garden Suite",
  "roomSlug": "garden-suite",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "totalAmount": 1960000,
  "expiresAt": null,
  "confirmedAt": "2026-07-24T09:05:10.000Z",
  "payment": {
    "paymentId": "uuid",
    "provider": "MOCKPAY",
    "providerOrderId": "MOCKPAY-6f48...",
    "status": "PAID",
    "checkoutUrl": "http://localhost:3000/api/v1/payments/mock/uuid/checkout",
    "qrCodeUrl": "https://api.qrserver.com/...",
    "paidAt": "2026-07-24T09:05:10.000Z"
  }
}
```

#### Mapping

| UI field | Request/Response |
|---|---|
| ngày nhận/trả | request `checkInDate`, `checkOutDate` |
| số khách | request `guestCount` |
| họ tên/email/phone | request `guestName`, `guestEmail`, `guestPhone` |
| tổng tiền | response `totalAmount` |
| QR code | response `payment.qrCodeUrl` |
| thời gian giữ chỗ | response `expiresAt` |
| trạng thái thanh toán realtime | `GET /payments/:bookingId/status` |
| restore trạng thái sau redirect | `GET /bookings/code/:bookingCode` |

---

### 2.4 Auth popup

#### APIs cần dùng
1. `POST /auth/login`
2. `POST /auth/register`
3. `POST /auth/forgot-password`
4. `POST /auth/reset-password`

#### Login request
```json
{
  "identifier": "hello@example.com",
  "password": "StrongPassword123"
}
```

#### Register request
```json
{
  "fullName": "Nguyen Minh Anh",
  "email": "hello@example.com",
  "phone": "0909123456",
  "password": "StrongPassword123"
}
```

---

## 3. Admin screens

### 3.1 Admin dashboard overview

#### APIs cần dùng
1. `GET /admin/analytics/dashboard-summary`
2. `GET /admin/analytics/revenue-timeline?range=30d`
3. `GET /admin/analytics/top-rooms?range=30d`

#### Response fields UI dùng

| UI field | Response field |
|---|---|
| tổng doanh thu | `totalRevenue` |
| booking confirmed | `confirmedBookings` |
| công suất TB | `averageOccupancyRate` |
| số phòng active | `activeRooms` |
| chart doanh thu | `items[].revenue` |
| chart theo phòng | `items[].roomName`, `items[].revenue` |

---

### 3.2 Admin rooms list

#### APIs cần dùng
1. `GET /admin/rooms`

#### Request
```http
GET /api/v1/admin/rooms?page=1&limit=10&keyword=suite&status=ACTIVE&roomType=SUITE
```

#### Response fields UI dùng

| UI field | Response field |
|---|---|
| tên phòng | `name` |
| loại phòng | `roomType` |
| slug | `slug` |
| mô tả ngắn | `shortDescription` |
| giá | `pricePerNight` |
| sức chứa | `maxGuests` |
| ảnh cover | `coverImageUrl` |
| số ảnh | `imageCount` |
| trạng thái | `status` |
| cập nhật gần nhất | `updatedAt` |

---

### 3.3 Admin create/edit room modal

#### APIs cần dùng
1. `GET /admin/rooms/:id`
2. `POST /admin/rooms`
3. `PATCH /admin/rooms/:id`
4. `POST /admin/uploads/room-images`
5. `POST /admin/rooms/:id/images/reorder`
6. `DELETE /admin/rooms/:roomId/images/:imageId`
7. `GET /admin/amenities`

#### Form fields cần có

| UI field | API field | DB field |
|---|---|---|
| tên phòng | `name` | `rooms.name` |
| slug | `slug` | `rooms.slug` |
| loại phòng | `roomType` | `rooms.room_type` |
| mô tả ngắn | `shortDescription` | `rooms.short_description` |
| mô tả dài | `description` | `rooms.description` |
| giá cứng / đêm | `pricePerNight` | `rooms.price_per_night` |
| số khách | `maxGuests` | `rooms.max_guests` |
| số phòng ngủ | `bedroomCount` | `rooms.bedroom_count` |
| số giường | `bedCount` | `rooms.bed_count` |
| số phòng tắm | `bathroomCount` | `rooms.bathroom_count` |
| diện tích | `sizeSqm` | `rooms.size_sqm` |
| thứ tự nổi bật | `featuredOrder` | `rooms.featured_order` |
| trạng thái | `status` | `rooms.status` |
| tiện nghi | `amenityIds[]` | `room_amenities.*` |
| gallery | `POST /admin/uploads/room-images` -> metadata -> `POST/PATCH /admin/rooms` | `room_images.*` |
| cover image | reorder payload `isCover` | `room_images.is_cover` |

#### Create room request
```json
{
  "name": "Garden Suite",
  "slug": "garden-suite",
  "roomType": "SUITE",
  "shortDescription": "Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng",
  "description": "Chi tiết đầy đủ...",
  "pricePerNight": 980000,
  "maxGuests": 2,
  "bedroomCount": 1,
  "bedCount": 1,
  "bathroomCount": 1,
  "sizeSqm": 38,
  "featuredOrder": 1,
  "status": "ACTIVE",
  "amenityIds": ["uuid-1", "uuid-2"]
}
```

#### Upload images response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "url": "https://cdn.example.com/rooms/garden-suite/gallery-1.jpg",
      "s3Key": "rooms/2026/garden-suite/gallery-1.jpg",
      "contentType": "image/jpeg",
      "sizeBytes": 421553,
      "isCover": false,
      "sortOrder": 2
    }
  ]
}
```

#### Reorder / set cover request
```json
{
  "images": [
    {
      "id": "uuid-1",
      "sortOrder": 1,
      "isCover": true
    },
    {
      "id": "uuid-2",
      "sortOrder": 2,
      "isCover": false
    }
  ]
}
```

---

### 3.4 Admin bookings management

#### APIs cần dùng
1. `GET /admin/bookings`
2. `GET /admin/bookings/:id`
3. `PATCH /admin/bookings/:id/status`
4. `POST /admin/bookings/:id/cancel`
5. `POST /admin/bookings/:id/refund`

#### Request
```http
GET /api/v1/admin/bookings?page=1&limit=10&roomId=uuid&status=CONFIRMED&paymentStatus=PAID&checkInFrom=2026-07-01&checkInTo=2026-08-31
```

#### Response fields UI dùng

| UI field | Response field | DB field |
|---|---|---|
| mã booking | `bookingCode` | `bookings.booking_code` |
| nguồn booking | `bookingSource` | `bookings.booking_source` |
| khách | `guestName`, `guestEmail` | `bookings.guest_name`, `bookings.guest_email` |
| phòng | `room.name` | `rooms.name` |
| ngày ở | `checkInDate`, `checkOutDate` | `bookings.check_in_date`, `bookings.check_out_date` |
| tổng tiền | `totalAmount` | `bookings.total_amount` |
| booking status | `status` | `bookings.status` |
| payment status | `paymentStatus` | `bookings.payment_status` |

---

### 3.5 Admin user management

#### APIs cần dùng
1. `GET /admin/users`
2. `GET /admin/users/:id`
3. `PATCH /admin/users/:id/role`
4. `PATCH /admin/users/:id/status`

#### Request
```http
GET /api/v1/admin/users?page=1&limit=10&role=CUSTOMER&status=ACTIVE&keyword=minh
```

#### Response fields UI dùng

| UI field | Response field | DB field |
|---|---|---|
| họ tên | `fullName` | `users.full_name` |
| email | `email` | `users.email` |
| phone | `phone` | `users.phone` |
| role | `role` | `roles.code` |
| status | `status` | `users.status` |
| số booking | `totalBookings` | aggregate từ `bookings` |

---

### 3.6 Admin amenities management

#### APIs cần dùng
1. `GET /admin/amenities`
2. `POST /admin/amenities`
3. `PATCH /admin/amenities/:id`
4. `DELETE /admin/amenities/:id`

#### Create amenity request
```json
{
  "code": "SMART_LOCK",
  "name": "Khóa cửa thông minh",
  "icon": "smart-lock"
}
```

---

## 4. Mapping check summary

### 4.1 Room management
- UI cần `roomType`, `shortDescription`, `description`, `pricePerNight`, `sizeSqm`, `featuredOrder`, gallery và cover image.
- DDL hiện đã cần map với:
  - `rooms.room_type`
  - `rooms.short_description`
  - `rooms.description`
  - `rooms.price_per_night`
  - `rooms.size_sqm`
  - `rooms.featured_order`
  - `room_images.is_cover`
  - `room_images.sort_order`

### 4.2 Booking management
- UI cần filter theo phòng, trạng thái, ngày check-in và hiển thị nguồn booking.
- DDL cần có `bookings.booking_source` để phản ánh `GUEST_CHECKOUT` và `CUSTOMER_ACCOUNT`.

### 4.3 Image upload flow
- UI room editor cần:
  - upload file
  - preview gallery
  - chọn cover
  - reorder
- API và DDL phải có metadata `s3Key`, `url`, `isCover`, `sortOrder`, `contentType`, `sizeBytes`.

### 4.4 User management
- UI admin đang dùng `ACTIVE`, `PENDING_ACTIVATION`, `SUSPENDED`.
- DDL và API phải giữ đúng naming này để tránh lệch trạng thái.
