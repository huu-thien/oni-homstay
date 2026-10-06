import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class MockpayWebhookDto {
  @IsString()
  eventId!: string;

  @IsString()
  providerOrderId!: string;

  @IsNumber()
  amount!: number;

  @IsIn(['PAID', 'FAILED', 'EXPIRED'])
  status!: 'PAID' | 'FAILED' | 'EXPIRED';

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  paidAt?: string;
}
