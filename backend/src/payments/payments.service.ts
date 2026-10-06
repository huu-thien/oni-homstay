import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { successResponse } from '../common/api-response';
import { BookingEntity } from '../database/entities/booking.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { PaymentEventEntity } from '../database/entities/payment-event.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { MailerService } from '../notifications/mailer.service';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(PaymentEventEntity)
    private readonly paymentEventRepository: Repository<PaymentEventEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokenRepository: Repository<PasswordResetTokenEntity>,
    private readonly paymentGatewayService: PaymentGatewayService,
    private readonly mailerService: MailerService,
  ) {}

  async getBookingPaymentStatus(bookingId: string) {
    await this.cleanupExpiredPendingBookings();
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: { room: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking.');
    }

    const payment = await this.paymentRepository.findOne({
      where: { booking: { id: booking.id } },
      order: { createdAt: 'DESC' },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy payment của booking.');
    }

    return successResponse(this.toStatusResponse(booking, payment));
  }

  async completeMockPayment(paymentId: string) {
    if (this.paymentGatewayService.getProvider() !== 'MOCKPAY') {
      throw new BadRequestException(
        'Endpoint mock payment chỉ dùng cho môi trường MOCKPAY.',
      );
    }

    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: { booking: { room: true, user: true } },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy payment.');
    }

    const payload =
      this.paymentGatewayService.createMockWebhookPayload(payment);
    const signature =
      this.paymentGatewayService.signMockWebhookPayload(payload);
    return this.handleWebhook('mockpay', payload, signature);
  }

  async completeMockCheckout(paymentId: string) {
    const response = await this.completeMockPayment(paymentId);
    return `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/booking/${response.data.roomSlug}?bookingCode=${encodeURIComponent(response.data.bookingCode)}&payment=paid`;
  }

  async handleWebhook(
    provider: string,
    payload: Record<string, unknown>,
    signature: string | null,
  ) {
    const normalizedEvent = await this.paymentGatewayService.normalizeWebhook(
      provider,
      payload,
      signature,
    );
    const existingEvent = await this.paymentEventRepository.findOne({
      where: { providerEventId: normalizedEvent.eventId },
    });

    if (existingEvent) {
      const payment = await this.paymentRepository.findOneByOrFail({
        id: existingEvent.payment.id,
      });
      const booking = await this.bookingRepository.findOneByOrFail({
        id: payment.booking.id,
      });
      return successResponse(
        this.toStatusResponse(booking, payment),
        'Webhook đã được xử lý trước đó.',
      );
    }

    const payment = await this.paymentRepository.findOne({
      where: { providerOrderId: normalizedEvent.providerOrderId },
      relations: { booking: { room: true, user: true } },
    });

    if (!payment) {
      throw new NotFoundException(
        'Không tìm thấy payment theo provider order id.',
      );
    }

    if (Number(payment.amount) !== normalizedEvent.amount) {
      throw new BadRequestException(
        'Số tiền webhook không khớp payment record.',
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const bookingRepository = manager.getRepository(BookingEntity);
      const paymentRepository = manager.getRepository(PaymentEntity);
      const eventRepository = manager.getRepository(PaymentEventEntity);
      const userRepository = manager.getRepository(UserEntity);
      const roleRepository = manager.getRepository(RoleEntity);
      const resetTokenRepository = manager.getRepository(
        PasswordResetTokenEntity,
      );

      const lockedPayment = await paymentRepository.findOne({
        where: { id: payment.id },
        relations: { booking: { room: true, user: true } },
      });

      if (!lockedPayment) {
        throw new NotFoundException('Không tìm thấy payment.');
      }

      const lockedBooking = await bookingRepository.findOne({
        where: { id: lockedPayment.booking.id },
        relations: { room: true, user: true },
      });

      if (!lockedBooking) {
        throw new NotFoundException('Không tìm thấy booking.');
      }

      const paymentEvent = eventRepository.create({
        payment: lockedPayment,
        provider: normalizedEvent.provider,
        providerEventId: normalizedEvent.eventId,
        status: normalizedEvent.status,
        signatureHash: signature,
        payload: JSON.stringify(normalizedEvent.rawPayload),
        processedAt: new Date(),
      });
      await eventRepository.save(paymentEvent);

      if (normalizedEvent.status === 'PAID') {
        const stillAvailable = await this.isRoomAvailable(
          lockedBooking.room.id,
          lockedBooking.checkInDate,
          lockedBooking.checkOutDate,
          lockedBooking.id,
        );

        if (!stillAvailable) {
          lockedPayment.status = 'FAILED';
          lockedPayment.failureReason = 'Late payment conflict';
          lockedBooking.status = 'CANCELLED';
          lockedBooking.paymentStatus = 'FAILED';
          lockedBooking.cancelledAt = new Date();
          lockedBooking.note = appendSystemNote(
            lockedBooking.note,
            'Thanh toán đến sau khi phòng không còn khả dụng.',
          );
          await paymentRepository.save(lockedPayment);
          await bookingRepository.save(lockedBooking);
          return {
            booking: lockedBooking,
            payment: lockedPayment,
            autoCreatedUser: null as UserEntity | null,
            temporaryPassword: null as string | null,
          };
        }

        lockedPayment.status = 'PAID';
        lockedPayment.providerTransactionId =
          normalizedEvent.transactionId ?? lockedPayment.providerTransactionId;
        lockedPayment.paidAt = normalizedEvent.paidAt
          ? new Date(normalizedEvent.paidAt)
          : new Date();
        lockedPayment.failureReason = null;
        lockedPayment.providerPayload = JSON.stringify(
          normalizedEvent.rawPayload,
        );
        lockedBooking.status = 'CONFIRMED';
        lockedBooking.paymentStatus = 'PAID';
        lockedBooking.confirmedAt = new Date();

        const userResolution = await this.ensureBookingUser(
          lockedBooking,
          userRepository,
          roleRepository,
          resetTokenRepository,
        );

        if (userResolution.user) {
          lockedBooking.user = userResolution.user;
        }

        await paymentRepository.save(lockedPayment);
        await bookingRepository.save(lockedBooking);

        return {
          booking: lockedBooking,
          payment: lockedPayment,
          autoCreatedUser: userResolution.created ? userResolution.user : null,
          temporaryPassword: userResolution.temporaryPassword,
        };
      }

      lockedPayment.status = normalizedEvent.status;
      lockedPayment.failureReason =
        normalizedEvent.status === 'FAILED'
          ? 'Gateway reported failed payment.'
          : 'Payment expired.';
      lockedPayment.providerPayload = JSON.stringify(
        normalizedEvent.rawPayload,
      );
      lockedBooking.paymentStatus = normalizedEvent.status;
      lockedBooking.status = 'CANCELLED';
      lockedBooking.cancelledAt = new Date();
      await paymentRepository.save(lockedPayment);
      await bookingRepository.save(lockedBooking);

      return {
        booking: lockedBooking,
        payment: lockedPayment,
        autoCreatedUser: null as UserEntity | null,
        temporaryPassword: null as string | null,
      };
    });

    if (result.payment.status === 'PAID') {
      if (result.booking.guestEmail) {
        await this.mailerService.sendBookingConfirmation({
          booking: result.booking,
          recipient: result.booking.guestEmail,
          roomName: result.booking.room.name,
        });
      }

      if (result.autoCreatedUser && result.temporaryPassword) {
        await this.mailerService.sendAutoAccountEmail({
          booking: result.booking,
          user: result.autoCreatedUser,
          temporaryPassword: result.temporaryPassword,
        });
      }
    }

    return successResponse(
      this.toStatusResponse(result.booking, result.payment),
      result.payment.status === 'PAID'
        ? 'Xử lý webhook thanh toán thành công.'
        : 'Đã cập nhật trạng thái thanh toán.',
    );
  }

  private async ensureBookingUser(
    booking: BookingEntity,
    userRepository: Repository<UserEntity>,
    roleRepository: Repository<RoleEntity>,
    resetTokenRepository: Repository<PasswordResetTokenEntity>,
  ) {
    if (booking.user) {
      return {
        user: booking.user,
        created: false,
        temporaryPassword: null as string | null,
      };
    }

    const normalizedEmail = booking.guestEmail?.trim().toLowerCase();
    const normalizedPhone = booking.guestPhone?.trim();
    const emailUser = normalizedEmail
      ? await userRepository.findOne({ where: { email: normalizedEmail } })
      : null;
    const phoneUser = normalizedPhone
      ? await userRepository.findOne({ where: { phone: normalizedPhone } })
      : null;

    if (emailUser && phoneUser && emailUser.id !== phoneUser.id) {
      throw new ConflictException(
        'Email và số điện thoại đang thuộc hai tài khoản khác nhau.',
      );
    }

    const existingUser = emailUser ?? phoneUser;

    if (existingUser) {
      return {
        user: existingUser,
        created: false,
        temporaryPassword: null as string | null,
      };
    }

    const temporaryPassword = generateTemporaryPassword();
    const customerRole = await roleRepository.findOneByOrFail({
      code: 'CUSTOMER',
    });
    const user = await userRepository.save(
      userRepository.create({
        fullName: booking.guestName,
        email: normalizedEmail!,
        phone: normalizedPhone!,
        passwordHash: hashPassword(temporaryPassword),
        status: 'ACTIVE',
        mustChangePassword: true,
        role: customerRole,
      }),
    );

    await resetTokenRepository.save(
      resetTokenRepository.create({
        user,
        token: randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
      }),
    );

    return {
      user,
      created: true,
      temporaryPassword,
    };
  }

  private toStatusResponse(booking: BookingEntity, payment: PaymentEntity) {
    return {
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      roomName: booking.room.name,
      roomSlug: booking.room.slug,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      totalAmount: Number(booking.totalAmount),
      expiresAt:
        booking.holdExpiresAt?.toISOString() ??
        payment.expiresAt?.toISOString() ??
        null,
      confirmedAt: booking.confirmedAt?.toISOString() ?? null,
      payment: {
        paymentId: payment.id,
        provider: payment.provider,
        providerOrderId: payment.providerOrderId,
        status: payment.status,
        checkoutUrl: payment.checkoutUrl,
        qrCodeUrl: payment.qrCodeUrl,
        paidAt: payment.paidAt?.toISOString() ?? null,
      },
    };
  }

  private async cleanupExpiredPendingBookings() {
    const now = new Date();
    const pendingBookings = await this.bookingRepository.find({
      where: { status: 'PENDING_PAYMENT' },
    });
    const expiredBookings = pendingBookings.filter(
      (booking) =>
        booking.holdExpiresAt &&
        new Date(booking.holdExpiresAt).getTime() <= now.getTime(),
    );

    if (!expiredBookings.length) {
      return;
    }

    for (const booking of expiredBookings) {
      booking.status = 'CANCELLED';
      booking.paymentStatus = 'EXPIRED';
      booking.cancelledAt = now;
      booking.note = appendSystemNote(
        booking.note,
        'Booking tu dong huy do het han giu cho.',
      );
    }

    await this.bookingRepository.save(expiredBookings);
  }

  private async isRoomAvailable(
    roomId: string,
    checkInDate: string,
    checkOutDate: string,
    excludeBookingId?: string,
  ) {
    const qb = this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room_id = :roomId', { roomId })
      .andWhere('booking.check_in_date < :checkOutDate', { checkOutDate })
      .andWhere('booking.check_out_date > :checkInDate', { checkInDate })
      .andWhere("booking.status NOT IN ('CANCELLED', 'REFUNDED')");

    if (excludeBookingId) {
      qb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const overlaps = await qb.getMany();

    return overlaps.every((booking) => {
      if (booking.status !== 'PENDING_PAYMENT') {
        return false;
      }

      return (
        booking.holdExpiresAt instanceof Date &&
        booking.holdExpiresAt.getTime() <= Date.now()
      );
    });
  }
}

function appendSystemNote(note: string | null, message: string) {
  return note ? `${note}\n[system] ${message}` : `[system] ${message}`;
}

function generateTemporaryPassword() {
  return `Oni@${randomBytes(6).toString('hex')}`;
}
