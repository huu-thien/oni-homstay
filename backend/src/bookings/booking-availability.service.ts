import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../database/entities/booking.entity';

@Injectable()
export class BookingAvailabilityService {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
  ) {}

  validateDateRange(checkInDate: string, checkOutDate: string) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException(
        'Ngày check-in hoặc check-out không hợp lệ.',
      );
    }

    const nightCount = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nightCount <= 0) {
      throw new BadRequestException('Ngày trả phòng phải sau ngày nhận phòng.');
    }

    return {
      checkIn,
      checkOut,
      nightCount,
    };
  }

  async cleanupExpiredPendingBookings() {
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

  async isRoomAvailable(
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
      return !this.blocksAvailability(booking);
    });
  }

  async getBookedDateRanges(roomId: string) {
    const bookings = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.room_id = :roomId', { roomId })
      .andWhere("booking.status NOT IN ('CANCELLED', 'REFUNDED')")
      .orderBy('booking.check_in_date', 'ASC')
      .getMany();

    return bookings
      .filter((booking) => this.blocksAvailability(booking))
      .map((booking) => ({
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
      }));
  }

  private blocksAvailability(booking: BookingEntity) {
    return (
      booking.status !== 'PENDING_PAYMENT' ||
      !(
        booking.holdExpiresAt instanceof Date &&
        booking.holdExpiresAt.getTime() <= Date.now()
      )
    );
  }
}

function appendSystemNote(note: string | null, message: string) {
  return note ? `${note}\n[system] ${message}` : `[system] ${message}`;
}
