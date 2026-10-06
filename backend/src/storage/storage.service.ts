import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { mkdirSync, promises as fs } from 'fs';
import { dirname, extname, join } from 'path';
import { randomUUID } from 'crypto';

type UploadedAsset = {
  name: string;
  url: string;
  s3Key: string;
  contentType: string | null;
  sizeBytes: number;
  altText: string | null;
};

@Injectable()
export class StorageService {
  private readonly bucket = process.env.AWS_S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? 'ap-southeast-1';
  private readonly endpoint = process.env.AWS_S3_ENDPOINT;
  private readonly publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  private readonly prefix = (process.env.AWS_S3_PREFIX ?? 'rooms').replace(
    /^\/+|\/+$/g,
    '',
  );
  private readonly forcePathStyle =
    process.env.AWS_S3_FORCE_PATH_STYLE === 'true';
  private readonly localUploadFolder = join(process.cwd(), 'uploads');
  private readonly s3Enabled = Boolean(this.bucket && this.region);
  private readonly s3Client = this.s3Enabled
    ? new S3Client({
        region: this.region,
        endpoint: this.endpoint || undefined,
        forcePathStyle: this.forcePathStyle,
        credentials:
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
            ? {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              }
            : undefined,
      })
    : null;

  async uploadRoomImages(files: Express.Multer.File[], roomSlug: string) {
    if (!files.length) {
      throw new BadRequestException('Không có file ảnh để upload.');
    }

    const safeSlug = normalizeSlug(roomSlug || 'draft-room');
    const uploaded: UploadedAsset[] = [];

    for (const file of files) {
      validateFile(file);
      const key = `${this.prefix}/${safeSlug}/${createAssetName(file.originalname)}`;

      if (this.s3Enabled && this.s3Client) {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );

        uploaded.push({
          name: file.originalname,
          url: this.resolveS3Url(key),
          s3Key: key,
          contentType: file.mimetype,
          sizeBytes: file.size,
          altText: stripExtension(file.originalname),
        });
        continue;
      }

      const filePath = join(this.localUploadFolder, ...key.split('/'));
      mkdirSync(dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.buffer);

      uploaded.push({
        name: file.originalname,
        url: `${getBackendOrigin()}/uploads/${key.replaceAll('\\', '/')}`,
        s3Key: key,
        contentType: file.mimetype,
        sizeBytes: file.size,
        altText: stripExtension(file.originalname),
      });
    }

    return uploaded;
  }

  async deleteAsset(key: string | null | undefined) {
    if (!key) {
      return;
    }

    if (this.s3Enabled && this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return;
    }

    const filePath = join(this.localUploadFolder, ...key.split('/'));
    await fs.rm(filePath, { force: true });
  }

  private resolveS3Url(key: string) {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, '')}/${key}`;
    }

    if (this.endpoint) {
      return `${this.endpoint.replace(/\/+$/, '')}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createAssetName(originalName: string) {
  return `${Date.now()}-${randomUUID().slice(0, 8)}${extname(originalName).toLowerCase()}`;
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function validateFile(file: Express.Multer.File) {
  if (!file.mimetype.startsWith('image/')) {
    throw new BadRequestException('Chỉ chấp nhận file ảnh.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new BadRequestException('Ảnh vượt quá giới hạn 5MB.');
  }
}

function getBackendOrigin() {
  const publicUrl = process.env.BACKEND_PUBLIC_URL;

  if (publicUrl) {
    return publicUrl.replace(/\/api\/v1\/?$/, '');
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}
