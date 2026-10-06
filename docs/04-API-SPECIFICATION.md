# 04 - API Specification

## 1. API conventions
- Base URL: `/api/v1`
- JSON response
- Time format: ISO 8601
- Currency: `VND`
- Auth: Bearer JWT cho endpoint protected
- Pagination format:
  - `page`
  - `limit`
  - `total`
  - `totalPages`

### Success response mẫu
```json
{
  "success": true,
  "data": {},
  "message": "OK"
}
```

### Paginated response mẫu
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 32,
      "totalPages": 4
    }
  }
}
```

### Error response mẫu
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is invalid"]
  }
}
```

---

## 2. Authentication APIs

### 2.1 Register
`POST /auth/register`

Request:
```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "phone": "0900000000",
  "password": "StrongPassword123"
}
```

### 2.2 Login
`POST /auth/login`

Request:
```json
{
  "identifier": "a@example.com",
  "password": "StrongPassword123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt",
    "user": {
      "id": "uuid",
      "fullName": "Nguyen Van A",
      "role": "CUSTOMER",
      "status": "ACTIVE"
    }
  }
}
```

### 2.3 Refresh token
`POST /auth/refresh`

### 2.4 Forgot password
`POST /auth/forgot-password`

### 2.5 Reset password
`POST /auth/reset-password`

### 2.6 Get my profile
`GET /me`

### 2.7 Update my profile
`PATCH /me`

---

## 3. Public room APIs

### 3.1 List rooms
`GET /rooms`

Query params:
- `page`
- `limit`
- `guestCount`

Response item:
```json
{
  "id": "uuid",
  "slug": "garden-suite",
  "name": "Garden Suite",
  "roomType": "SUITE",
  "shortDescription": "Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng",
  "pricePerNight": 980000,
  "maxGuests": 2,
  "coverImage": {
    "url": "https://cdn.example.com/rooms/garden-suite/cover.jpg"
  },
  "amenities": ["WIFI", "BREAKFAST", "SMART_LOCK"]
}
```

### 3.2 Room detail
`GET /rooms/:slug`

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "garden-suite",
    "name": "Garden Suite",
    "roomType": "SUITE",
    "shortDescription": "Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng",
    "description": "Chi tiết đầy đủ...",
    "pricePerNight": 980000,
    "maxGuests": 2,
    "bedroomCount": 1,
    "bedCount": 1,
    "bathroomCount": 1,
    "sizeSqm": 38,
    "status": "ACTIVE",
    "images": [
      {
        "id": "uuid",
        "url": "https://cdn.example.com/rooms/garden-suite/cover.jpg",
        "altText": "Garden Suite cover",
        "isCover": true,
        "sortOrder": 1
      }
    ],
    "amenities": [
      {
        "id": "uuid",
        "code": "WIFI",
        "name": "Wifi tốc độ cao"
      }
    ]
  }
}
```

### 3.3 Check availability
`GET /rooms/availability`

Query params:
- `checkInDate`
- `checkOutDate`
- `guestCount`

Response:
```json
{
  "success": true,
  "data": [
    {
      "roomId": "uuid",
      "slug": "garden-suite",
      "name": "Garden Suite",
      "available": true,
      "nightCount": 2,
      "pricePerNight": 980000,
      "totalAmount": 1960000,
      "coverImageUrl": "https://cdn.example.com/rooms/garden-suite/cover.jpg",
      "amenities": ["WIFI", "BREAKFAST", "SMART_LOCK"]
    }
  ]
}
```

---

## 4. Guest booking APIs

### 4.1 Create guest checkout booking
`POST /bookings/guest-checkout`

Request:
```json
{
  "roomId": "uuid",
  "checkInDate": "2026-07-25",
  "checkOutDate": "2026-07-27",
  "guestCount": 2,
  "guestName": "Tran Thi B",
  "guestEmail": "b@example.com",
  "guestPhone": "0911111111",
  "note": "Den som"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "bookingCode": "HS202607240001",
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
}
```

Business rules:
1. Kiểm tra `checkOutDate > checkInDate`
2. Kiểm tra `guestCount <= room.maxGuests`
3. Kiểm tra overlap booking theo khoảng ngày
4. Booking `PENDING_PAYMENT` giữ chỗ **15 phút**
5. Nếu email/phone khớp tài khoản có sẵn thì booking sẽ link với user đó
6. Nếu chưa có tài khoản, chỉ tạo account sau khi payment thành công

### 4.2 Get booking by code
`GET /bookings/code/:bookingCode`

Response chính:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bookingCode": "ONI260724AB12",
    "roomName": "Garden Suite",
    "roomSlug": "garden-suite",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "holdExpiresAt": null,
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
}
```

---

## 5. Payment APIs

### 5.1 Get payment status
`GET /payments/:bookingId/status`

Response:
```json
{
  "success": true,
  "data": {
    "bookingId": "uuid",
    "bookingCode": "ONI260724AB12",
    "roomName": "Garden Suite",
    "roomSlug": "garden-suite",
    "status": "PENDING_PAYMENT",
    "paymentStatus": "PENDING",
    "totalAmount": 1960000,
    "expiresAt": "2026-07-24T09:00:00.000Z",
    "confirmedAt": null,
    "payment": {
      "paymentId": "uuid",
      "provider": "MOCKPAY",
      "providerOrderId": "MOCKPAY-6f48...",
      "status": "PENDING",
      "checkoutUrl": "http://localhost:3000/api/v1/payments/mock/uuid/checkout",
      "qrCodeUrl": "https://api.qrserver.com/..."
    }
  }
}
```

### 5.2 Payment webhook
`POST /payments/webhooks/mockpay`

Production với PayOS:
`POST /payments/webhooks/payos`

Headers:
```http
x-mockpay-signature: <hmac_sha256_signature>
```

Request:
```json
{
  "eventId": "evt_123456",
  "providerOrderId": "MOCKPAY-6f48...",
  "amount": 1960000,
  "status": "PAID",
  "transactionId": "txn_123456",
  "paidAt": "2026-07-24T09:05:10.000Z"
}
```

PayOS webhook body được verify trực tiếp bằng SDK `@payos/node` dựa trên payload chuẩn của PayOS và không dùng header `x-mockpay-signature`.

### 5.3 Local mock payment complete
`POST /payments/mock/:paymentId/complete`

Mục đích:
- chỉ dùng cho local/dev
- mô phỏng gateway gọi webhook thành công
- giúp FE booking flow chạy end-to-end khi chưa có credential thật

Backend processing:
1. Verify signature
2. Find payment by provider order id
3. Check amount
4. Check idempotency
5. If valid:
   - update payment `PAID`
   - update booking `CONFIRMED`
   - create user if needed
   - send booking confirmation email
   - send auto-account email nếu là khách mới

---

## 6. Admin room APIs

### 6.1 List rooms
`GET /admin/rooms`

Query params:
- `page`
- `limit`
- `keyword`
- `status`
- `roomType`

Response item:
```json
{
  "id": "uuid",
  "slug": "garden-suite",
  "name": "Garden Suite",
  "roomType": "SUITE",
  "shortDescription": "Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng",
  "pricePerNight": 980000,
  "maxGuests": 2,
  "bedroomCount": 1,
  "bedCount": 1,
  "bathroomCount": 1,
  "sizeSqm": 38,
  "featuredOrder": 1,
  "status": "ACTIVE",
  "coverImageUrl": "https://cdn.example.com/rooms/garden-suite/cover.jpg",
  "imageCount": 4,
  "updatedAt": "2026-07-24T09:00:00.000Z"
}
```

### 6.2 Get room detail
`GET /admin/rooms/:id`

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "garden-suite",
    "name": "Garden Suite",
    "roomType": "SUITE",
    "shortDescription": "Yên tĩnh, ngập nắng và nhìn ra khoảng xanh riêng",
    "description": "Mô tả chi tiết...",
    "pricePerNight": 980000,
    "maxGuests": 2,
    "bedroomCount": 1,
    "bedCount": 1,
    "bathroomCount": 1,
    "sizeSqm": 38,
    "featuredOrder": 1,
    "status": "ACTIVE",
    "amenities": [
      {
        "id": "uuid-1",
        "code": "WIFI",
        "name": "Wifi tốc độ cao"
      }
    ],
    "images": [
      {
        "id": "uuid",
        "url": "https://cdn.example.com/rooms/garden-suite/cover.jpg",
        "s3Key": "rooms/2026/garden-suite/cover.jpg",
        "contentType": "image/jpeg",
        "sizeBytes": 321234,
        "altText": "Garden Suite cover",
        "isCover": true,
        "sortOrder": 1
      }
    ]
  }
}
```

### 6.3 Create room
`POST /admin/rooms`

Request:
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

### 6.4 Update room
`PATCH /admin/rooms/:id`

Request body tương tự create, chỉ gửi field thay đổi.

### 6.5 Delete room
`DELETE /admin/rooms/:id`

### 6.6 Upload room images
`POST /admin/rooms/:id/images`

Multipart form-data:
- `files[]`
- `altTexts[]` optional

Response:
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

### 6.7 Reorder room images
`POST /admin/rooms/:id/images/reorder`

Request:
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

### 6.8 Delete room image
`DELETE /admin/rooms/:roomId/images/:imageId`

---

## 7. Admin amenity APIs

### 7.1 List amenities
`GET /admin/amenities`

### 7.2 Create amenity
`POST /admin/amenities`

Request:
```json
{
  "code": "SMART_LOCK",
  "name": "Khóa cửa thông minh",
  "icon": "smart-lock"
}
```

### 7.3 Update amenity
`PATCH /admin/amenities/:id`

### 7.4 Delete amenity
`DELETE /admin/amenities/:id`

---

## 8. Admin booking APIs

### 8.1 List bookings
`GET /admin/bookings`

Query params:
- `page`
- `limit`
- `roomId`
- `status`
- `paymentStatus`
- `checkInFrom`
- `checkInTo`
- `keyword`

Response item:
```json
{
  "id": "uuid",
  "bookingCode": "ONI240701",
  "bookingSource": "GUEST_CHECKOUT",
  "room": {
    "id": "uuid",
    "name": "Garden Suite"
  },
  "guestName": "Nguyen Minh Anh",
  "guestEmail": "minhanh@gmail.com",
  "checkInDate": "2026-07-26",
  "checkOutDate": "2026-07-28",
  "totalAmount": 1960000,
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "createdAt": "2026-07-20T09:00:00.000Z"
}
```

### 8.2 Get booking detail
`GET /admin/bookings/:id`

### 8.3 Update booking status
`PATCH /admin/bookings/:id/status`

Request:
```json
{
  "status": "CHECKED_IN"
}
```

### 8.4 Cancel booking
`POST /admin/bookings/:id/cancel`

### 8.5 Refund booking
`POST /admin/bookings/:id/refund`

---

## 9. Admin user APIs

### 9.1 List users
`GET /admin/users`

Query params:
- `page`
- `limit`
- `role`
- `status`
- `keyword`

Response item:
```json
{
  "id": "uuid",
  "fullName": "Nguyen Minh Anh",
  "email": "minhanh@gmail.com",
  "phone": "0909123456",
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "totalBookings": 3,
  "joinedAt": "2026-06-11T09:00:00.000Z"
}
```

### 9.2 Get user detail
`GET /admin/users/:id`

### 9.3 Create user
`POST /admin/users`

### 9.4 Update user
`PATCH /admin/users/:id`

### 9.5 Update user role
`PATCH /admin/users/:id/role`

### 9.6 Update user status
`PATCH /admin/users/:id/status`

---

## 10. Admin analytics APIs

### 10.1 Dashboard summary
`GET /admin/analytics/dashboard-summary`

Response:
```json
{
  "success": true,
  "data": {
    "totalRevenue": 42100000,
    "confirmedBookings": 39,
    "averageOccupancyRate": 82,
    "activeRooms": 3
  }
}
```

### 10.2 Revenue timeline
`GET /admin/analytics/revenue-timeline?range=30d`

### 10.3 Top rooms by revenue
`GET /admin/analytics/top-rooms?range=90d`

---

## 11. HTTP status codes

| Code | Khi dùng |
|---|---|
| 200 | Thành công |
| 201 | Tạo mới |
| 400 | Validation/business rule error |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict |
| 422 | Business rule invalid |
| 500 | Server error |

---

## 12. Nguyên tắc API quan trọng
- Không có review endpoints trong MVP.
- Không có pricing rule endpoints trong MVP.
- Giá phòng được quản lý trực tiếp trên room.
- Ảnh phòng đi qua upload endpoint riêng và lưu metadata vào `room_images`.
- Booking list và user list phải có pagination/filter cho admin.
- Webhook payment phải idempotent.
