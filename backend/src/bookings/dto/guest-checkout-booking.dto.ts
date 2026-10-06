import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class GuestCheckoutBookingDto {
  @IsString()
  roomId!: string;

  @IsDateString()
  checkInDate!: string;

  @IsDateString()
  checkOutDate!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  guestCount!: number;

  @IsString()
  @MaxLength(150)
  guestName!: string;

  @IsEmail()
  guestEmail!: string;

  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  guestPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
