import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { successResponse } from '../common/api-response';
import { BookingEntity } from '../database/entities/booking.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { RoomEntity } from '../database/entities/room.entity';
import { UserEntity } from '../database/entities/user.entity';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { BookingAvailabilityService } from './booking-availability.service';
import { GuestCheckoutBookingDto } from './dto/guest-checkout-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    @InjectRepository(RoomEntity)
    private readonly roomRepository: Repository<RoomEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly availabilityService: BookingAvailabilityService,
    private readonly paymentGatewayService: PaymentGatewayService,
  ) {}

  async createGuestCheckout(payload: GuestCheckoutBookingDto) {
    await this.availabilityService.cleanupExpiredPendingBookings();
    const { nightCount } = this.availabilityService.validateDateRange(
      payload.checkInDate,
      payload.checkOutDate,
    );

    const room = await this.roomRepository.findOneBy({ id: payload.roomId });

    if (!room || room.status !== 'ACTIVE') {
      throw new NotFoundException(
        'Phòng không tồn tại hoặc chưa sẵn sàng nhận booking.',
      );
    }

    if (payload.guestCount > room.maxGuests) {
      throw new BadRequestException('Số khách vượt quá sức chứa của phòng.');
    }

    const isAvailable = await this.availabilityService.isRoomAvailable(
      room.id,
      payload.checkInDate,
      payload.checkOutDate,
    );

    if (!isAvailable) {
      throw new ConflictException(
        'Phòng đã có booking trùng khoảng ngày đã chọn.',
      );
    }

    const linkedUser = await this.findConsistentUser(
      payload.guestEmail,
      payload.guestPhone,
    );
    const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const booking = await this.bookingRepository.save(
      this.bookingRepository.create({
        bookingCode: await this.generateBookingCode(),
        user: linkedUser,
        room,
        bookingSource: 'GUEST_CHECKOUT',
        guestName: payload.guestName.trim(),
        guestEmail: payload.guestEmail.trim().toLowerCase(),
        guestPhone: payload.guestPhone.trim(),
        checkInDate: payload.checkInDate,
        checkOutDate: payload.checkOutDate,
        guestCount: payload.guestCount,
        roomPriceSnapshot: room.pricePerNight,
        totalAmount: String(Number(room.pricePerNight) * nightCount),
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PENDING',
        note: payload.note?.trim() ?? null,
        holdExpiresAt,
        confirmedAt: null,
        cancelledAt: null,
        refundedAt: null,
      }),
    );

    const pendingPayment = this.paymentRepository.create({
      booking,
      provider: this.paymentGatewayService.getProvider(),
      providerOrderId: generateProviderOrderId(
        this.paymentGatewayService.getProvider(),
      ),
      amount: booking.totalAmount,
      status: 'PENDING',
      checkoutUrl: null,
      qrCodeUrl: null,
      providerTransactionId: null,
      expiresAt: holdExpiresAt,
      paidAt: null,
      failureReason: null,
      providerPayload: null,
    });

    let savedPayment = await this.paymentRepository.save(pendingPayment);

    try {
      const checkout = await this.paymentGatewayService.createCheckout(
        {
          ...savedPayment,
          booking,
        },
        booking,
      );
      savedPayment.provider = checkout.provider;
      savedPayment.providerOrderId = checkout.providerOrderId;
      savedPayment.checkoutUrl = checkout.checkoutUrl;
      savedPayment.qrCodeUrl = checkout.qrCodeUrl;
      savedPayment.expiresAt = checkout.expiresAt;
      savedPayment.providerPayload = JSON.stringify(checkout.rawPayload);
      savedPayment = await this.paymentRepository.save(savedPayment);
    } catch (error) {
      savedPayment.status = 'FAILED';
      savedPayment.failureReason =
        error instanceof Error ? error.message : 'Create payment link failed.';
      booking.status = 'CANCELLED';
      booking.paymentStatus = 'FAILED';
      booking.cancelledAt = new Date();
      booking.note = appendSystemNote(
        booking.note,
        'Tạo payment link thất bại nên booking đã được giải phóng.',
      );
      await this.paymentRepository.save(savedPayment);
      await this.bookingRepository.save(booking);
      throw new ServiceUnavailableException(
        'Không thể khởi tạo thanh toán với nhà cung cấp hiện tại.',
      );
    }

    return successResponse(
      {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        bookingSource: booking.bookingSource,
        status: booking.status,
        roomPriceSnapshot: Number(booking.roomPriceSnapshot),
        totalAmount: Number(booking.totalAmount),
        expiresAt: holdExpiresAt.toISOString(),
        payment: {
          paymentId: savedPayment.id,
          provider: savedPayment.provider,
          providerOrderId: savedPayment.providerOrderId,
          checkoutUrl: savedPayment.checkoutUrl,
          qrCodeUrl: savedPayment.qrCodeUrl,
          status: savedPayment.status,
          expiresAt:
            savedPayment.expiresAt?.toISOString() ??
            holdExpiresAt.toISOString(),
        },
      },
      'Tạo booking chờ thanh toán thành công.',
    );
  }

  async getBookingByCode(bookingCode: string) {
    await this.availabilityService.cleanupExpiredPendingBookings();
    const booking = await this.bookingRepository.findOne({
      where: { bookingCode },
      relations: { user: true, room: true },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy booking.');
    }

    const payment = await this.paymentRepository.findOne({
      where: { booking: { id: booking.id } },
      order: { createdAt: 'DESC' },
    });

    return successResponse(this.toBookingDetail(booking, payment));
  }

  private async generateBookingCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = `ONI${new Date().toISOString().slice(2, 10).replaceAll('-', '')}${randomBytes(2).toString('hex').toUpperCase()}`;
      const existing = await this.bookingRepository.findOne({
        where: { bookingCode: candidate },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new ConflictException(
      'Không thể tạo booking code duy nhất. Vui lòng thử lại.',
    );
  }

  private async findConsistentUser(email: string, phone: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const emailUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
    const phoneUser = await this.userRepository.findOne({
      where: { phone: normalizedPhone },
    });

    if (emailUser && phoneUser && emailUser.id !== phoneUser.id) {
      throw new ConflictException(
        'Email và số điện thoại đang thuộc về hai tài khoản khác nhau.',
      );
    }

    return emailUser ?? phoneUser ?? null;
  }

  private toBookingDetail(
    booking: BookingEntity,
    payment: PaymentEntity | null,
  ) {
    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      roomId: booking.room.id,
      roomName: booking.room.name,
      roomSlug: booking.room.slug,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      guestCount: booking.guestCount,
      roomPriceSnapshot: Number(booking.roomPriceSnapshot),
      totalAmount: Number(booking.totalAmount),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      note: booking.note,
      holdExpiresAt: booking.holdExpiresAt?.toISOString() ?? null,
      confirmedAt: booking.confirmedAt?.toISOString() ?? null,
      payment: payment
        ? {
            paymentId: payment.id,
            provider: payment.provider,
            providerOrderId: payment.providerOrderId,
            status: payment.status,
            checkoutUrl: payment.checkoutUrl,
            qrCodeUrl: payment.qrCodeUrl,
            expiresAt: payment.expiresAt?.toISOString() ?? null,
            paidAt: payment.paidAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}

function generateProviderOrderId(provider: 'MOCKPAY' | 'PAYOS') {
  if (provider === 'PAYOS') {
    return (
      String(Date.now()).slice(-11) +
      String(Math.floor(Math.random() * 9000) + 1000)
    );
  }

  return `mock-${randomUUID().replaceAll('-', '')}`;
}

function appendSystemNote(note: string | null, message: string) {
  return note ? `${note}\n[system] ${message}` : `[system] ${message}`;
}
