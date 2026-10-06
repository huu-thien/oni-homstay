import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class AdminRoomListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  roomType?: string;
}

export class RoomImageInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  s3Key!: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsOptional()
  sizeBytes?: number | null;

  @IsOptional()
  @IsString()
  altText?: string;

  isCover!: boolean;

  @Type(() => Number)
  @IsInt()
  sortOrder!: number;
}

export class UpsertRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  roomType!: string;

  @IsString()
  @IsNotEmpty()
  shortDescription!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePerNight!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxGuests!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bedroomCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bedCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  bathroomCount!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sizeSqm!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  featuredOrder!: number;

  @IsIn(['ACTIVE', 'MAINTENANCE', 'INACTIVE'])
  status!: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenityIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomImageInputDto)
  images?: RoomImageInputDto[];
}

export class UpsertAmenityDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class UploadRoomImagesDto {
  @IsOptional()
  @IsString()
  roomSlug?: string;
}

export class AdminBookingListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsDateString()
  checkInFrom?: string;

  @IsOptional()
  @IsDateString()
  checkInTo?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class UpdateBookingStatusDto {
  @IsIn([
    'PENDING_PAYMENT',
    'CONFIRMED',
    'CHECKED_IN',
    'CHECKED_OUT',
    'CANCELLED',
    'REFUNDED',
  ])
  status!: string;
}

export class AdminUserListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

export class CreateAdminUserDto {
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsEmail()
  email!: string;

  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(['CUSTOMER', 'STAFF', 'ADMIN'])
  role!: string;

  @IsIn(['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'])
  status!: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phone?: string;
}

export class UpdateUserRoleDto {
  @IsIn(['CUSTOMER', 'STAFF', 'ADMIN'])
  role!: string;
}

export class UpdateUserStatusDto {
  @IsIn(['ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED'])
  status!: string;
}

export class AnalyticsRangeQueryDto {
  @IsOptional()
  @IsIn(['30d', '90d', '180d'])
  range?: '30d' | '90d' | '180d' = '90d';
}

export class RoomImagesPayloadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoomImageInputDto)
  items!: RoomImageInputDto[];
}

export class ReorderRoomImagesDto {
  @IsArray()
  images!: {
    id: string;
    sortOrder: number;
    isCover: boolean;
  }[];
}
