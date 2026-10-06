import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':bookingId/status')
  getBookingPaymentStatus(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getBookingPaymentStatus(bookingId);
  }

  @Post('webhooks/:provider')
  handlePaymentWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-mockpay-signature') signature?: string,
  ) {
    return this.paymentsService.handleWebhook(
      provider,
      payload,
      signature ?? null,
    );
  }

  @Post('mock/:paymentId/complete')
  completeMockPayment(@Param('paymentId') paymentId: string) {
    return this.paymentsService.completeMockPayment(paymentId);
  }

  @Get('mock/:paymentId/checkout')
  async completeMockCheckout(
    @Param('paymentId') paymentId: string,
    @Res() response: Response,
  ) {
    const redirectUrl =
      await this.paymentsService.completeMockCheckout(paymentId);
    return response.redirect(302, redirectUrl);
  }
}
