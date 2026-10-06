import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MaxLength(150)
  fullName: string;

  @IsEmail()
  email: string;

  @Matches(/^(0|\+84)[0-9]{9,10}$/)
  phone: string;

  @IsString()
  @MinLength(8)
  password: string;
}
