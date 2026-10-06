import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomUUID } from 'crypto';
import { PayOS } from '@payos/node';
import type {
  Webhook as PayOSWebhook,
  WebhookData as PayOSWebhookData,
} from '@payos/node/lib/resources/webhooks/webhook';
import { PaymentEntity } from '../database/entities/payment.entity';
import { BookingEntity } from '../database/entities/booking.entity';

export type MockpayWebhookPayload = {
  eventId: string;
  providerOrderId: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'EXPIRED';
  transactionId?: string;
  paidAt?: string;
};

export type NormalizedWebhookEvent = {
  provider: 'MOCKPAY' | 'PAYOS';
  eventId: string;
  providerOrderId: string;
  amount: number;
  status: 'PAID' | 'FAILED' | 'EXPIRED';
  transactionId?: string;
  paidAt?: string;
  rawPayload: Record<string, unknown>;
};

export type PaymentCheckoutResult = {
  provider: 'MOCKPAY' | 'PAYOS';
  providerOrderId: string;
  checkoutUrl: string;
  qrCodeUrl: string;
  expiresAt: Date | null;
  rawPayload: Record<string, unknown>;
};

@Injectable()
export class PaymentGatewayService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private readonly provider =
    (process.env.PAYMENT_PROVIDER ?? 'MOCKPAY').toUpperCase() === 'PAYOS'
      ? 'PAYOS'
      : 'MOCKPAY';
  private readonly backendBaseUrl =
    process.env.BACKEND_PUBLIC_URL ??
    `http://localhost:${process.env.PORT ?? 3000}/api/v1`;
  private readonly mockpaySecret =
    process.env.PAYMENT_WEBHOOK_SECRET ?? 'oni-homstay-mockpay-secret';
  private readonly payosClient =
    this.provider === 'PAYOS'
      ? new PayOS({
          clientId: process.env.PAYOS_CLIENT_ID,
          apiKey: process.env.PAYOS_API_KEY,
          checksumKey: process.env.PAYOS_CHECKSUM_KEY,
          partnerCode: process.env.PAYOS_PARTNER_CODE,
          baseURL: process.env.PAYOS_BASE_URL,
          timeout: 30000,
          maxRetries: 2,
        })
      : null;

  async onApplicationBootstrap() {
    if (
      this.provider !== 'PAYOS' ||
      process.env.PAYOS_AUTO_CONFIRM_WEBHOOK === 'false'
    ) {
      return;
    }

    try {
      await this.getPayOSClient().webhooks.confirm(this.resolveWebhookUrl());
    } catch (error) {
      this.logger.warn(
        `Không thể auto-confirm webhook PayOS: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  getProvider() {
    return this.provider;
  }

  async createCheckout(
    payment: PaymentEntity,
    booking: BookingEntity,
  ): Promise<PaymentCheckoutResult> {
    if (this.provider === 'PAYOS') {
      const payos = this.getPayOSClient();
      const orderCode = Number(payment.providerOrderId);

      if (!Number.isSafeInteger(orderCode)) {
        throw new BadRequestException('PayOS order code không hợp lệ.');
      }

      const result = await payos.paymentRequests.create({
        orderCode,
        amount: Number(payment.amount),
        description: this.buildPayOSDescription(booking.bookingCode),
        returnUrl: this.resolveReturnUrl(booking),
        cancelUrl: this.resolveCancelUrl(booking),
        buyerName: booking.guestName,
        buyerEmail: booking.guestEmail ?? undefined,
        buyerPhone: booking.guestPhone ?? undefined,
        items: [
          {
            name: booking.room.name,
            quantity: 1,
            price: Number(payment.amount),
          },
        ],
        expiredAt: payment.expiresAt
          ? Math.floor(payment.expiresAt.getTime() / 1000)
          : undefined,
      });

      return {
        provider: 'PAYOS',
        providerOrderId: String(result.orderCode),
        checkoutUrl: result.checkoutUrl,
        qrCodeUrl: result.qrCode,
        expiresAt: result.expiredAt
          ? new Date(result.expiredAt * 1000)
          : payment.expiresAt,
        rawPayload: {
          paymentLinkId: result.paymentLinkId,
          bin: result.bin,
          accountNumber: result.accountNumber,
          accountName: result.accountName,
          currency: result.currency,
          status: result.status,
        },
      };
    }

    const checkoutUrl = `${this.backendBaseUrl}/payments/mock/${payment.id}/checkout`;

    return {
      provider: 'MOCKPAY',
      providerOrderId: payment.providerOrderId,
      checkoutUrl,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(checkoutUrl)}`,
      expiresAt: payment.expiresAt,
      rawPayload: {
        provider: 'MOCKPAY',
      },
    };
  }

  createMockWebhookPayload(payment: PaymentEntity): MockpayWebhookPayload {
    return {
      eventId: `evt_${randomUUID()}`,
      providerOrderId: payment.providerOrderId,
      amount: Number(payment.amount),
      status: 'PAID',
      transactionId: `txn_${randomUUID().replaceAll('-', '').slice(0, 20)}`,
      paidAt: new Date().toISOString(),
    };
  }

  signMockWebhookPayload(payload: MockpayWebhookPayload) {
    return createHmac('sha256', this.mockpaySecret)
      .update(this.toCanonicalString(payload))
      .digest('hex');
  }

  async normalizeWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature?: string | null,
  ): Promise<NormalizedWebhookEvent> {
    const normalizedProvider = provider.trim().toUpperCase();

    if (normalizedProvider === 'PAYOS') {
      const payos = this.getPayOSClient();
      const verified = await payos.webhooks.verify(payload as PayOSWebhook);

      return this.normalizePayOSWebhook(verified, payload);
    }

    if (normalizedProvider !== 'MOCKPAY') {
      throw new BadRequestException('Provider thanh toán chưa được hỗ trợ.');
    }

    const mockPayload = payload as unknown as MockpayWebhookPayload;
    this.verifyMockWebhookSignature(mockPayload, signature);

    return {
      provider: 'MOCKPAY',
      eventId: mockPayload.eventId,
      providerOrderId: mockPayload.providerOrderId,
      amount: mockPayload.amount,
      status: mockPayload.status,
      transactionId: mockPayload.transactionId,
      paidAt: mockPayload.paidAt,
      rawPayload: payload,
    };
  }

  private normalizePayOSWebhook(
    data: PayOSWebhookData,
    rawPayload: Record<string, unknown>,
  ): NormalizedWebhookEvent {
    return {
      provider: 'PAYOS',
      eventId: `payos:${data.paymentLinkId}:${data.reference || data.transactionDateTime || data.orderCode}`,
      providerOrderId: String(data.orderCode),
      amount: Number(data.amount),
      status: data.code === '00' ? 'PAID' : 'FAILED',
      transactionId: data.reference || data.paymentLinkId,
      paidAt: toIsoDate(data.transactionDateTime),
      rawPayload,
    };
  }

  private verifyMockWebhookSignature(
    payload: MockpayWebhookPayload,
    signature?: string | null,
  ) {
    if (!signature) {
      throw new UnauthorizedException('Thiếu chữ ký webhook.');
    }

    const expected = this.signMockWebhookPayload(payload);

    if (expected !== signature) {
      throw new UnauthorizedException('Webhook signature không hợp lệ.');
    }
  }

  private toCanonicalString(payload: MockpayWebhookPayload) {
    return [
      payload.eventId,
      payload.providerOrderId,
      payload.amount,
      payload.status,
      payload.transactionId ?? '',
      payload.paidAt ?? '',
    ].join('|');
  }

  private resolveReturnUrl(booking: BookingEntity) {
    return process.env.PAYMENT_RETURN_URL
      ? `${process.env.PAYMENT_RETURN_URL}?bookingCode=${encodeURIComponent(booking.bookingCode)}`
      : `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/booking/${booking.room.slug}?bookingCode=${encodeURIComponent(booking.bookingCode)}&payment=return`;
  }

  private resolveCancelUrl(booking: BookingEntity) {
    return process.env.PAYMENT_CANCEL_URL
      ? `${process.env.PAYMENT_CANCEL_URL}?bookingCode=${encodeURIComponent(booking.bookingCode)}`
      : `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/booking/${booking.room.slug}?bookingCode=${encodeURIComponent(booking.bookingCode)}&payment=cancel`;
  }

  private buildPayOSDescription(bookingCode: string) {
    return `ONI ${bookingCode.slice(-16)}`.slice(0, 25);
  }

  private resolveWebhookUrl() {
    return process.env.PAYMENT_WEBHOOK_URL
      ? process.env.PAYMENT_WEBHOOK_URL
      : `${this.backendBaseUrl.replace(/\/+$/, '')}/payments/webhooks/payos`;
  }

  private getPayOSClient() {
    if (!this.payosClient) {
      throw new BadRequestException('PayOS chưa được cấu hình.');
    }

    return this.payosClient;
  }
}

function toIsoDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
