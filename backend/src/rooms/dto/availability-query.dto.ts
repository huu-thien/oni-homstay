import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsString()
  roomType?: string;
}
