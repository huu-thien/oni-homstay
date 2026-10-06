# 01 - Product Requirement Document

## 1. Tổng quan sản phẩm

### 1.1 Tên dự án
Website đặt phòng Homestay Huế phục vụ vận hành thực tế.

### 1.2 Mục tiêu kinh doanh
- Tăng tỷ lệ đặt phòng trực tiếp thay vì phụ thuộc OTA.
- Tạo trải nghiệm đặt phòng đẹp, dễ dùng và đáng tin cậy trên mobile.
- Tự động hóa thanh toán, xác nhận booking, email, quản trị vận hành.
- Xây nền tảng đủ sạch để phát triển lâu dài.

### 1.3 Mục tiêu sản phẩm
- Khách tìm phòng trống nhanh theo ngày.
- Khách xem thông tin phòng rõ ràng, hình ảnh đẹp, tiện nghi nổi bật.
- Khách đặt phòng và thanh toán mà không cần đăng nhập trước.
- Hệ thống tự tạo tài khoản cho khách mới sau booking đầu tiên.
- Admin quản lý phòng, tiện nghi, giá cứng từng phòng, booking, người dùng và doanh thu.

### 1.4 Trọng tâm trải nghiệm
- UI phải **đẹp, hiện đại, thơ mộng nhẹ**, phù hợp tinh thần Huế.
- Responsive 100% trên mobile, tablet, desktop.
- Mobile-first cho toàn bộ flow booking.
- Giao diện client ưu tiên cảm xúc và chuyển đổi.
- Giao diện admin ưu tiên rõ ràng, thao tác nhanh.

### 1.5 Phạm vi giai đoạn 1
- Public website.
- Admin dashboard.
- Tìm phòng trống theo ngày.
- Chi tiết phòng với gallery và tiện nghi nổi bật.
- Guest checkout không cần login.
- Thanh toán QR tự động.
- Email giao dịch tự động.
- Upload ảnh lên AWS S3.
- Deploy production FE + BE + DB.

### 1.6 Ngoài phạm vi giai đoạn 1
- Review/đánh giá phòng.
- Coupon/discount.
- Giá theo mùa, ngày lễ, rule phức tạp.
- Mobile app native.
- Đồng bộ OTA hai chiều.

---

## 2. Chân dung người dùng

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| Khách du lịch nội địa | Đặt nhanh trên mobile, thích QR | Giao diện đẹp, ít bước, xác nhận nhanh |
| Khách quốc tế | Quan tâm ảnh, tiện nghi, chính sách | Nội dung rõ, trực quan, dễ tin tưởng |
| Staff/Lễ tân | Theo dõi booking hằng ngày | Danh sách booking rõ, đổi trạng thái nhanh |
| Chủ homestay/Admin | Quản lý toàn bộ vận hành | CRUD phòng, tiện nghi, giá, doanh thu |

---

## 3. Giá trị cốt lõi
- **Thẩm mỹ có bản sắc:** hiện đại nhưng mềm mại, tinh tế, gợi chất Huế.
- **Đặt phòng dễ:** không ép login trước, ít bước, rõ trạng thái thanh toán.
- **Vận hành đơn giản:** admin chỉ cần tạo phòng, gắn tiện nghi, nhập giá cứng, cập nhật khi muốn.
- **Tự động hóa thông minh:** webhook xác nhận thanh toán, email xác nhận, auto tạo account.

---

## 4. Business requirements

### 4.1 Tính năng khách hàng
1. Xem trang chủ với hình ảnh, giới thiệu homestay, phòng nổi bật, tiện ích chung.
2. Tìm phòng trống theo:
   - ngày check-in
   - ngày check-out
   - số khách
3. Xem trang chi tiết phòng:
   - gallery ảnh
   - mô tả
   - giá mỗi đêm
   - sức chứa
   - tiện nghi nổi bật
   - chính sách lưu trú
4. Đặt phòng không cần đăng nhập.
5. Thanh toán QR qua cổng thanh toán tự động.
6. Nhận email xác nhận booking sau thanh toán thành công.
7. Nếu là khách mới:
   - hệ thống tự tạo tài khoản từ email hoặc số điện thoại
   - sinh mật khẩu ngẫu nhiên
   - gửi email thông tin kích hoạt/đổi mật khẩu
8. Đăng nhập để xem lịch sử booking.
9. Quên mật khẩu qua email reset link hoặc OTP.

### 4.2 Tính năng quản trị
1. CRUD phòng.
2. Thiết lập thông tin phòng:
   - tên
   - loại phòng
   - slug
   - mô tả ngắn
   - mô tả
   - số khách tối đa
   - số phòng ngủ
   - số giường
   - số phòng tắm
   - diện tích
   - giá cứng mỗi đêm
   - trạng thái
   - thứ tự nổi bật
3. CRUD tiện nghi.
4. Gắn tiện nghi nổi bật cho từng phòng khi tạo/chỉnh sửa phòng.
5. Upload, sắp xếp, chọn ảnh cover cho phòng qua AWS S3.
6. Quản lý booking:
   - pending payment
   - confirmed
   - checked-in
   - checked-out
   - cancelled
   - refunded
7. Quản lý tài khoản:
   - customer
   - staff
   - admin
8. Dashboard doanh thu cơ bản:
   - theo ngày
   - theo tháng
   - theo phòng
   - tỷ lệ lấp đầy
9. Danh sách quản trị cần có filter, phân trang và trạng thái rõ ràng cho vận hành thực tế.

---

## 5. User journeys

### 5.1 Guest booking không cần login
1. Người dùng vào Home.
2. Chọn check-in, check-out, số khách.
3. Hệ thống trả danh sách phòng còn trống.
4. Người dùng mở trang chi tiết phòng.
5. Người dùng nhập thông tin liên hệ và xác nhận đặt.
6. Hệ thống tạo booking `PENDING_PAYMENT`.
7. Hệ thống tạo payment session và hiển thị QR.
8. Người dùng thanh toán.
9. Gateway gọi webhook về backend.
10. Backend xác thực webhook.
11. Nếu hợp lệ:
    - cập nhật payment `PAID`
    - cập nhật booking `CONFIRMED`
    - tạo account nếu khách chưa tồn tại
    - gửi email xác nhận và thông tin account nếu cần

### 5.2 Đăng ký thủ công
1. Người dùng chọn Đăng ký.
2. Nhập họ tên, email hoặc số điện thoại, mật khẩu.
3. Hệ thống tạo account.
4. Gửi email xác minh nếu bật xác minh email.
5. Người dùng đăng nhập.

### 5.3 Quên mật khẩu
1. Người dùng nhập email.
2. Hệ thống sinh token hoặc OTP.
3. Gửi email.
4. Người dùng đặt mật khẩu mới.

### 5.4 Admin cập nhật giá phòng
1. Admin vào Dashboard.
2. Chọn phòng cần chỉnh sửa.
3. Sửa giá cứng mỗi đêm.
4. Giá mới được áp dụng cho các booking tạo sau thời điểm cập nhật.

---

## 6. Functional requirements

### 6.1 Authentication
- Email/password.
- JWT access token + refresh token.
- RBAC: customer, staff, admin.
- Guest checkout không cần token.
- Auto account creation sau thanh toán thành công.

### 6.2 Room catalog
- Mỗi phòng có:
  - tên
  - slug
  - loại phòng
  - mô tả ngắn
  - mô tả
  - giá cứng mỗi đêm
  - số khách tối đa
  - số phòng ngủ / giường / phòng tắm
  - diện tích
  - gallery ảnh
  - ảnh cover
  - tiện nghi nổi bật
- Admin toàn quyền chỉnh sửa thông tin này.

### 6.3 Availability
- Kiểm tra phòng trống theo khoảng ngày.
- Không cho overbooking.
- Booking `PENDING_PAYMENT` giữ phòng trong thời gian ngắn, ví dụ 15 phút.

### 6.4 Booking
- Mỗi booking có booking code duy nhất.
- Lưu snapshot giá tại thời điểm đặt.
- Gắn booking vào user nếu user tồn tại hoặc được auto-create.

### 6.5 Payment
- Tích hợp tối thiểu 1 gateway production-ready.
- Khuyến nghị PayOS cho giai đoạn 1.
- Webhook là nguồn xác nhận cuối cùng.

### 6.6 Email
- Gửi:
  - booking confirmation
  - invoice/receipt
  - auto-created account
  - reset password

### 6.7 Admin CMS
- Upload ảnh lên S3.
- Gắn tiện nghi nổi bật cho phòng.
- Sửa giá cứng của phòng bất cứ lúc nào.
- Quản lý booking và người dùng.

---

## 7. Non-functional requirements
- Responsive 100%.
- UI client phải đẹp, hiện đại, tinh tế, thơ mộng nhẹ.
- Ảnh tối ưu, lazy load.
- API validation chặt chẽ.
- Có audit log cho thao tác admin quan trọng.
- Hash password bằng bcrypt hoặc argon2.
- Rate limit cho auth và webhook.

---

## 8. Quy tắc nghiệp vụ chính

### 8.1 Availability
- `check_out_date > check_in_date`
- Không cho booking chồng lấn với booking giữ phòng hoặc đã xác nhận.
- Booking `PENDING_PAYMENT` hết hiệu lực sau thời gian giữ phòng.

### 8.2 Auto account creation
- Ưu tiên match theo email.
- Nếu không có email, fallback số điện thoại.
- Nếu đã có account thì gắn booking vào account đó.
- Nếu chưa có thì tạo account `CUSTOMER`, sinh mật khẩu random, yêu cầu đổi mật khẩu.

### 8.3 Pricing
- Mỗi phòng có **giá cứng mỗi đêm** do admin thiết lập trực tiếp.
- Khi admin đổi giá, giá mới chỉ áp dụng cho booking mới.
- Booking cũ giữ nguyên snapshot giá đã chốt.

### 8.4 Amenities
- Tiện nghi là dữ liệu quản trị.
- Admin có thể tạo danh mục tiện nghi và gắn vào phòng khi tạo/chỉnh sửa phòng.

---

## 9. KPI đề xuất
- Conversion rate từ tìm phòng đến thanh toán thành công.
- Tỷ lệ bỏ thanh toán.
- Tỷ lệ đặt phòng trên mobile.
- Occupancy rate theo tháng.
- Tỷ lệ quay lại của khách đã có account.

---

## 10. Backlog giai đoạn triển khai

### Phase 1 - MVP production
- Home page
- Room listing + availability search
- Room detail
- Guest checkout
- Payment webhook
- Email confirmation
- Admin CRUD room/amenities
- Basic analytics

### Phase 2
- Multi-language
- Richer dashboard
- Coupon nếu thực sự cần

### Phase 3
- OTA integration
- CRM khách hàng

---

## 11. Rủi ro và giảm thiểu

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Double booking | Mất uy tín | Transaction + locking |
| Webhook lặp/chậm | Sai trạng thái | Idempotency + payment event log |
| Ảnh nặng | Chậm mobile | WebP, lazy load, CDN |
| Mail vào spam | Khách không nhận xác nhận | SPF/DKIM/DMARC |
| Admin nhập sai giá | Sai doanh thu | Validation + audit log |

---

## 12. Acceptance criteria
- Khách đặt phòng trên mobile không cần login.
- Sau thanh toán thành công, booking tự chuyển confirmed.
- Khách nhận email xác nhận.
- Nếu là khách mới, hệ thống tự tạo account và gửi mail tương ứng.
- Admin tạo/sửa phòng, giá cứng, tiện nghi và ảnh thành công.
- Website có giao diện đẹp, hiện đại, mang tinh thần Huế và hoạt động ổn định trên production.
