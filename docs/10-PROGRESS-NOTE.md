# 10. Progress Note

## 1. Tổng quan

Dự án **O ni homestay** hiện đã có nền tảng tài liệu, frontend client, frontend admin và backend NestJS dùng **TypeORM** đủ để vận hành các luồng:

- popup **đăng nhập / đăng ký / quên mật khẩu**
- trang **Home**
- trang **Room Detail**
- trang **Booking** với checkout + QR + polling trạng thái payment
- dashboard **Admin** với dữ liệu thật từ API
- quản trị **phòng**, **booking**, **user**, **analytics**

Toàn bộ phần public và admin hiện tại đã được căn chỉnh thống nhất giữa:

- **Docs**
- **Frontend React**
- **Backend NestJS**
- **Database schema qua TypeORM entities + migrations**

---

## 2. Tài liệu đã hoàn thành

Đã hoàn thiện bộ tài liệu trong `docs/`:

1. `01-PRD.md`
2. `02-SYSTEM-ARCHITECTURE.md`
3. `03-DATABASE-DESIGN.md`
4. `04-API-SPECIFICATION.md`
5. `05-UI-UX-GUIDELINES.md`
6. `06-AWS-S3-GUIDE.md`
7. `07-PAYMENT-EMAIL-FLOW.md`
8. `08-DEPLOYMENT-GUIDE.md`
9. `09-SCREEN-API-MAPPING.md`

Các tài liệu đã được cập nhật theo đúng scope hiện tại:

- UI mang tinh thần **Huế hiện đại, nhẹ nhàng, thơ mộng**
- **không có review phòng**
- **giá phòng là giá cứng**
- admin tự cấu hình **tiện nghi, mô tả, ảnh, giá, trạng thái phòng**

---

## 3. Frontend đã hoàn thành

### 3.1. Client UI

Đã hoàn thiện các màn hình:

- **Home**
- **Room Detail**
- **Booking page UI**
- **Auth modal** mở từ header, không dùng trang auth riêng

Các điểm chính:

- dùng typography đồng nhất
- responsive cho mobile / tablet / desktop
- visual theo concept thương hiệu Huế
- có thể dùng ảnh mạng tạm thời để demo giao diện

### 3.2. Admin UI

Đã hoàn thiện dashboard admin theo hướng chuyên nghiệp:

- **Overview / thống kê**
- **Quản lý phòng**
- **Quản lý booking**
- **Quản lý user**
- **Biểu đồ doanh thu**
- **Filter + pagination**
- form CRUD phòng đầy đủ trường thông tin
- editor tiện nghi và gallery ảnh theo luồng S3

Admin dashboard hiện đã gọi **backend API thật**, không còn chạy bằng mock local cho phần dữ liệu chính.

---

## 4. Backend đã hoàn thành

### 4.1. Nền tảng kỹ thuật

Backend đã được dựng bằng:

- **NestJS**
- **TypeORM**
- **Migration TypeORM**
- hỗ trợ `postgres` cho môi trường thật
- hỗ trợ `sqljs` cho local test / e2e

### 4.2. Public APIs đã xong

Đã implement và nối vào frontend:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `GET /rooms`
- `GET /rooms/:slug`
- `GET /rooms/availability`

### 4.3. Admin APIs đã xong

Đã implement đầy đủ nhóm admin:

- **Admin rooms**
  - list / detail / create / update / delete
  - upload image metadata
  - reorder images
  - delete image
- **Amenities**
  - list / create / update / delete
- **Bookings**
  - list / detail
  - update status
  - cancel
  - refund
- **Users**
  - list / detail
  - create
  - update thông tin
  - đổi role
  - đổi status
- **Analytics**
  - dashboard summary
  - revenue timeline
  - top rooms

### 4.4. Auth & phân quyền

Đã có:

- access token signed
- auth guard
- role guard
- decorator `@Roles(...)`
- chặn đúng quyền để **chỉ ADMIN** truy cập admin APIs

Tài khoản seed sẵn:

- **Admin:** `admin / Admin@123`
- **Customer:** `minhanh@gmail.com / Customer@123`

---

## 5. Database đã hoàn thành

Đã define và dùng thật qua TypeORM các entity chính:

- `roles`
- `users`
- `password_reset_tokens`
- `rooms`
- `room_images`
- `amenities`
- `room_amenities`
- `bookings`
- `payments`
- `payment_events`
- `email_logs`

Đã có:

- migration khởi tạo schema nền
- migration mở rộng cho booking / payment / email
- seed dữ liệu mẫu cho room / user / admin / booking / amenity / payment
- mapping nhất quán giữa docs, entity, API response và frontend types

---

## 6. Đồng bộ FE - BE - DB

Hiện tại các màn hình sau đã đi qua API thật và ăn khớp DB:

- popup auth
- home
- room detail
- booking page
- admin dashboard overview
- admin room listing + CRUD
- admin bookings listing
- admin users listing
- admin analytics

Đồng thời đã sửa lỗi persist gallery ảnh khi tạo phòng admin để luồng create/update room hoạt động ổn định với `room_images`.

Luồng booking/payment hiện đã có:

- tạo booking `PENDING_PAYMENT`
- giữ chỗ 15 phút
- check overlap để tránh overbooking
- payment status polling
- webhook mock có verify signature + idempotency
- auto-create account sau payment thành công
- booking confirmation email + auto-account email + reset password email log

---

## 7. Kiểm tra đã hoàn thành

Đã xác nhận:

- **frontend build thành công**
- **frontend lint thành công**
- **backend build thành công**
- **backend lint thành công**
- **backend e2e pass**

Các e2e hiện đã cover:

- health
- API info
- public auth
- public rooms
- guest booking + mock payment + auto-account
- admin authorization
- admin analytics
- admin room CRUD
- admin booking status update
- admin user management

---

## 8. Quality rule hiện tại

Từ thời điểm này, codebase áp dụng rule bắt buộc:

- **không chấp nhận lỗi TypeScript**
- **không chấp nhận lỗi lint**
- trước khi merge/deploy phải pass:
  - frontend: `npm run build` và `npm run lint`
  - backend: `npm run build`, `npm run lint`, `npm run test:e2e`

---

## 9. Phần còn lại của roadmap

Các hạng mục nên làm tiếp theo:

1. Hoàn thiện webhook sandbox/live thật trên môi trường production và xác nhận dashboard PayOS
2. Hoàn thiện domain email production (`EMAIL_FROM`, SPF/DKIM/DMARC)
3. Hoàn thiện luồng **deploy production**
4. Bổ sung logging, monitoring, rate limit, env strategy cho môi trường thực tế
5. Thêm cron/queue cho retry mail, reconcile payment và cleanup file rác nếu cần

---

## 10. Kết luận hiện trạng

Ở mốc hiện tại, dự án đã có:

- bộ docs tương đối đầy đủ để tiếp tục phát triển
- giao diện client/admin đồng bộ concept
- backend NestJS + TypeORM có cấu trúc rõ ràng
- quyền admin an toàn ở mức nền tảng
- dữ liệu và API đã đủ để chạy booking/payment local end-to-end, sẵn sàng thay gateway thật ở phase kế tiếp
