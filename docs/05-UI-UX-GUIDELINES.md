# 05 - UI/UX Guidelines

## 1. Design direction

Frontend triển khai bằng Material UI 6, Emotion và MUI X Date Pickers.
Design tokens nằm tại `frontend/src/theme.ts`. Form ngày dùng Day.js, truyền
`YYYY-MM-DD` theo ngày lưu trú tại Huế; không chuyển ngày sang UTC ISO timestamp.
API hiện kiểm tra phòng trống theo khoảng ngày, không có khung giờ hoặc lịch
ngày đã đặt. UI chỉ hiển thị availability đã được backend xác nhận.
Website phải mang cảm giác:
- **đẹp**
- **hiện đại**
- **sạch**
- **thơ mộng nhẹ**
- **tinh tế đúng chất Huế**

Mục tiêu không phải kiểu cổ điển nặng nề, mà là:
- hiện đại, cao cấp vừa phải
- nhiều khoảng thở
- hình ảnh cảm xúc
- màu dịu, lãng mạn, dễ chịu

---

## 2. Brand moodboard

### Từ khóa cảm xúc
- thanh lịch
- dịu dàng
- thư thái
- ấm áp
- mộc
- romantic local

### Hình ảnh gợi ý
- chiều tím Huế
- sông Hương
- tường vàng nhạt
- gỗ nâu ấm
- xanh rêu dịu
- nắng xuyên rèm
- sân vườn yên tĩnh

---

## 3. Design principles
1. **Ảnh đẹp là trung tâm** của trải nghiệm client.
2. **Typography sang nhẹ** để tạo cảm giác boutique homestay.
3. **CTA rõ nhưng không gắt**.
4. **Content ngắn, giàu cảm xúc, dễ tin tưởng**.
5. **UI phải conversion-oriented**: đẹp nhưng vẫn tối ưu đặt phòng.

---

## 4. Color palette đề xuất

| Token | Màu | Hex | Mục đích |
|---|---|---|---|
| Primary | Hue Plum | `#73507C` | CTA, điểm nhấn |
| Secondary | Moss Sage | `#728B7A` | nền phụ, icon, tag |
| Accent | Muted Gold | `#C6A96B` | highlight tinh tế |
| Background | Warm Ivory | `#F8F3EC` | nền tổng |
| Surface | Soft Cream | `#FFFDF9` | card, modal, form |
| Surface Alt | Blush Mist | `#F3EAE6` | section nền mềm |
| Text Primary | Deep Cocoa | `#2F241F` | text chính |
| Text Secondary | Dusty Taupe | `#786A63` | text phụ |
| Border | Sand Beige | `#E8DDD1` | border |
| Success | Olive Green | `#47735C` | trạng thái thành công |

### Quy tắc dùng màu
- CTA chính dùng `Primary`.
- `Accent` chỉ dùng cho giá, badge hoặc chi tiết nhấn nhẹ.
- Không dùng quá nhiều màu mạnh cùng lúc.
- Trang admin có thể giản lược palette để tập trung dữ liệu.

---

## 5. Typography

### Font pairing đề xuất
- Heading: `Playfair Display` hoặc `Cormorant Garamond`
- Body/UI: `Inter` hoặc `Be Vietnam Pro`

### Type scale
| Level | Mobile | Desktop |
|---|---|---|
| H1 | 34px | 56px |
| H2 | 28px | 42px |
| H3 | 22px | 30px |
| H4 | 18px | 24px |
| Body | 15px | 16px |
| Small | 13px | 14px |

### Quy tắc
- Heading mềm, thanh, có chất boutique.
- Body rõ, dễ đọc, không quá nghệ thuật.
- Tránh block text quá dài ở client pages.

---

## 6. Layout system

### Grid
- Mobile: 4 cột
- Tablet: 8 cột
- Desktop: 12 cột

### Container
- Mobile: padding 16px
- Tablet: padding 24px
- Desktop: max-width 1240px

### Spacing scale
`4, 8, 12, 16, 24, 32, 48, 64, 96`

---

## 7. Responsive rules

### Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### Bắt buộc
1. Thiết kế mobile-first.
2. Search/booking widget phải dễ thao tác bằng ngón tay.
3. Form checkout tối giản và không quá dài.
4. Ảnh luôn crop đẹp, không méo.
5. Sticky CTA trên mobile nếu cần để tăng conversion.

---

## 8. Core components

### 8.1 Header
- Sticky nhẹ, nền mờ hoặc solid tinh tế khi scroll.
- Logo + nav ngắn gọn.
- CTA `Đặt phòng ngay`.

### 8.2 Hero
- Ảnh lớn giàu cảm xúc.
- Overlay nhẹ.
- Booking/search box nổi bật.
- Headline ngắn, sang, dễ nhớ.

### 8.3 Room card
- Ảnh cover đẹp.
- Hiển thị:
  - tên phòng
  - số khách tối đa
  - giá mỗi đêm
  - 2-4 tiện nghi nổi bật
  - CTA xem chi tiết

### 8.4 Room detail
- Gallery đẹp và ưu tiên visual.
- Mô tả ngắn gọn, giàu cảm xúc.
- Tiện nghi nổi bật hiển thị icon + label.
- Giá rõ ràng.
- Booking summary luôn dễ thấy.

### 8.5 Checkout form
- Chia khối rõ:
  - thông tin lưu trú
  - thông tin liên hệ
  - tổng tiền
  - thanh toán
- Giảm nhiễu tối đa.

### 8.6 Admin tables/forms
- Gọn, rõ, thao tác ít click.
- Room form phải dễ nhập giá cứng và chọn tiện nghi.

---

## 9. Visual direction theo trang

### Home
- Hero cinematic
- Intro ngắn
- Featured rooms
- Amenity section
- Gallery/lifestyle section
- Location/contact

### Room detail
- Hero gallery
- Thông tin giá + sức chứa + tiện nghi
- Mô tả
- Chính sách
- CTA booking rõ

### Checkout
- Conversion-first
- Không có thành phần gây xao nhãng
- Payment trạng thái rõ

### Admin
- Neutral, practical, readable

---

## 10. UX rules cho booking conversion
- Không ép login trước.
- Giá phải rõ ràng và minh bạch.
- Luôn hiển thị:
  - số đêm
  - giá mỗi đêm
  - tổng tiền
- Sau thanh toán thành công phải có:
  - booking code
  - trạng thái confirmed
  - nhắc kiểm tra email

---

## 11. Accessibility
- Tương phản đạt mức dùng tốt cho nội dung chính.
- Focus state rõ trên button/input.
- Có `alt` cho ảnh.
- Form có label rõ ràng.
- Không chỉ dùng màu để biểu đạt trạng thái.

---

## 12. Microcopy style
- Nhẹ nhàng, lịch sự, tinh tế.
- Tránh quá kỹ thuật.
- Ví dụ:
  - `Kiểm tra phòng trống`
  - `Chọn ngày lưu trú`
  - `Hoàn tất thanh toán`
  - `Mã đặt phòng của bạn`

---

## 13. Motion & interaction
- Hover nhẹ, mượt.
- Transition ngắn 150-250ms.
- Tránh animation phô trương.
- Skeleton loading cho danh sách phòng và gallery.

---

## 14. Design tokens gợi ý

```text
radius-sm: 8px
radius-md: 14px
radius-lg: 22px
shadow-soft: 0 14px 40px rgba(47, 36, 31, 0.10)
shadow-card: 0 8px 24px rgba(47, 36, 31, 0.06)
border-color: #E8DDD1
```

---

## 15. Ảnh và media
- Dùng ảnh thật của homestay.
- Tone ảnh thống nhất, ấm và mềm.
- Nén WebP/AVIF nếu có thể.
- Ưu tiên ảnh không gian, ánh sáng, chất liệu, góc chill.

---

## 16. Điều cần tránh
- Màu quá chói.
- Quá nhiều icon/màu/decoration trên một màn hình.
- Layout dày đặc làm mất cảm giác nghỉ dưỡng.
- Admin UI rườm rà với quá nhiều bước khi tạo phòng.
