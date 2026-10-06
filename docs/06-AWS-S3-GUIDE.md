# 06 - AWS S3 Guide

## 1. Mục tiêu
Thiết lập AWS S3 từ đầu để:
- lưu ảnh phòng
- upload ảnh từ backend NestJS
- trả URL ảnh cho frontend

Khuyến nghị giai đoạn 1:
- upload file đi qua backend NestJS
- bucket riêng cho môi trường production

---

## 2. Chuẩn bị
- Tài khoản AWS
- Email và thẻ thanh toán để kích hoạt AWS nếu cần
- Dự án NestJS đã có module upload/file

---

## 3. Tạo S3 bucket

### 3.1 Đăng nhập AWS Console
- Vào `AWS Console`
- Tìm dịch vụ `S3`
- Chọn `Create bucket`

### 3.2 Cấu hình bucket
- Bucket name: duy nhất toàn cầu  
  Ví dụ: `hue-homestay-prod-assets`
- Region: chọn gần người dùng/backend, ví dụ `ap-southeast-1` (Singapore)

### 3.3 Object Ownership
- Chọn `ACLs disabled (recommended)`

### 3.4 Public access
Khuyến nghị:
- Giữ `Block all public access` nếu muốn bucket private và trả ảnh qua signed URL/CDN.
- Nếu muốn public ảnh phòng đơn giản ở giai đoạn đầu, có thể mở public read có kiểm soát bằng bucket policy.

**Khuyến nghị production thực dụng giai đoạn 1**
- Bucket public-read cho ảnh phòng public
- Không dùng bucket này cho dữ liệu nhạy cảm

---

## 4. Tạo IAM user riêng cho ứng dụng

### 4.1 Tạo user
- Vào `IAM`
- Chọn `Users` -> `Create user`
- Tên gợi ý: `homestay-s3-app`
- Không cần console access

### 4.2 Tạo policy giới hạn
Ví dụ policy chỉ cho thao tác trong 1 bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::hue-homestay-prod-assets/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::hue-homestay-prod-assets"
    }
  ]
}
```

### 4.3 Lấy access key
- Tạo access key cho user này
- Lưu:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`

---

## 5. Bucket policy public-read mẫu
Chỉ dùng nếu muốn ảnh truy cập public trực tiếp.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::hue-homestay-prod-assets/*"
    }
  ]
}
```

---

## 6. CORS cho bucket
Nếu frontend gọi trực tiếp S3 bằng browser mới cần CORS rộng hơn. Với giai đoạn đầu upload qua backend, CORS S3 ít quan trọng.

Mẫu CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:5173"],
    "ExposeHeaders": []
  }
]
```

---

## 7. Cài package cho NestJS

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

Nếu upload multipart:

```bash
npm install multer @nestjs/platform-express
```

---

## 8. Environment variables

```env
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=hue-homestay-prod-assets
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_PUBLIC_BASE_URL=https://hue-homestay-prod-assets.s3.ap-southeast-1.amazonaws.com
AWS_S3_PREFIX=rooms
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
BACKEND_PUBLIC_URL=https://api.yourhomestay.vn/api/v1
```

---

## 9. Trạng thái implementation hiện tại

Backend hiện đã có `StorageService` thực tế:

- nếu có `AWS_S3_BUCKET` + `AWS_REGION` thì upload lên **AWS S3 thật**
- nếu chưa có S3 env thì fallback lưu local vào `backend/uploads/`
- backend đang expose static path `/uploads/*` cho local fallback

Endpoint admin đang dùng:

```http
POST /api/v1/admin/uploads/room-images
Content-Type: multipart/form-data
Authorization: Bearer <admin_access_token>
```

Form-data:
- `roomSlug`: slug phòng hoặc `draft-room`
- `files`: nhiều file ảnh

Response mẫu:
```json
{
  "success": true,
  "data": [
    {
      "id": "",
      "name": "cover",
      "url": "https://hue-homestay-prod-assets.s3.ap-southeast-1.amazonaws.com/rooms/garden-suite/172189....jpg",
      "s3Key": "rooms/garden-suite/172189....jpg",
      "contentType": "image/jpeg",
      "sizeBytes": 284192,
      "altText": "cover",
      "isCover": true,
      "sortOrder": 1
    }
  ]
}
```

Ngoài upload, backend cũng đã:

- xóa object storage khi admin xóa ảnh riêng lẻ
- xóa object storage khi gallery thay đổi trong lúc update room
- xóa object storage khi xóa cả room

---

## 10. Service upload trong NestJS

```ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class S3Service {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  async uploadRoomImage(file: Express.Multer.File) {
    const key = `rooms/${new Date().getFullYear()}/${randomUUID()}-${file.originalname}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      key,
      url: `${process.env.AWS_S3_PUBLIC_BASE_URL}/${key}`,
    };
  }

  async deleteObject(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      }),
    );
  }
}
```

---

## 11. Upload controller mẫu

```ts
import {
  Controller,
  Body,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('admin/uploads')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('room-images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadRoomImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('roomSlug') roomSlug: string,
  ) {
    return this.s3Service.uploadRoomImages(files, roomSlug);
  }
}
```

---

## 12. Validation bắt buộc
- Giới hạn dung lượng, ví dụ 5MB/ảnh.
- Chỉ cho phép:
  - image/jpeg
  - image/png
  - image/webp
- Đổi tên file bằng UUID, không tin tên file user.
- Quét nội dung nếu sau này cần bảo mật cao hơn.

---

## 13. Lưu metadata vào database
Sau upload thành công, lưu:
- `room_id`
- `s3_key`
- `url`
- `content_type`
- `size_bytes`
- `sort_order`
- `is_cover`

Không chỉ lưu URL vì về sau cần delete hoặc migrate CDN.

---

## 14. Best practices production
- Không dùng root account.
- Tách bucket staging và production.
- Bật versioning nếu muốn chống xóa nhầm.
- Có lifecycle rule cho file cũ nếu cần.
- Cân nhắc CloudFront khi traffic ảnh tăng.

---

## 14. Quy trình upload thực tế
1. Admin chọn ảnh.
2. Frontend gửi multipart lên backend.
3. Backend validate file.
4. Backend upload lên S3.
5. Backend lưu metadata vào DB.
6. Backend trả URL ảnh.
7. Frontend hiển thị gallery.

---

## 15. Troubleshooting

| Lỗi | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| AccessDenied | IAM policy/bucket policy sai | Kiểm tra permission bucket và object |
| SignatureDoesNotMatch | Sai key/secret/region | Kiểm tra env |
| 403 khi mở ảnh | Bucket đang private | Mở public-read hoặc dùng signed URL |
| Upload quá chậm | Ảnh lớn | Resize trước upload |

---

## 16. Lộ trình nâng cấp
- Giai đoạn 1: upload qua backend, public image URL
- Giai đoạn 2: presigned URL cho upload trực tiếp
- Giai đoạn 3: CloudFront + image optimization pipeline
