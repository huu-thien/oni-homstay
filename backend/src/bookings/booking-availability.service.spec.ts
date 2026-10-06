import { DataSource, SelectQueryBuilder } from 'typeorm';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingEntity } from '../database/entities/booking.entity';

describe('Booked calendar dates', () => {
  let service: BookingAvailabilityService;
  let builder: SelectQueryBuilder<BookingEntity>;
  beforeEach(() => {
    const dataSource = new DataSource({ type: 'postgres' });
    const repository = dataSource.getRepository(BookingEntity);
    builder = new SelectQueryBuilder<BookingEntity>(dataSource);
    jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(builder);
    service = new BookingAvailabilityService(repository);
  });

  it('uses the same blocking rules for calendar ranges and overlap checks', async () => {
    const fixtures = [
      { status: 'CONFIRMED', holdExpiresAt: null, day: 10 },
      {
        status: 'PENDING_PAYMENT',
        holdExpiresAt: new Date(Date.now() + 60000),
        day: 12,
      },
      {
        status: 'PENDING_PAYMENT',
        holdExpiresAt: new Date(Date.now() - 60000),
        day: 14,
      },
      { status: 'CANCELLED', holdExpiresAt: null, day: 16 },
      { status: 'REFUNDED', holdExpiresAt: null, day: 18 },
      { status: 'PENDING_PAYMENT', holdExpiresAt: null, day: 20 },
    ];
    const bookings = fixtures.map((fixture) =>
      Object.assign(new BookingEntity(), {
        bookingCode: `CALENDAR-${fixture.day}`,
        guestName: 'Test',
        guestCount: 1,
        checkInDate: `2099-03-${fixture.day}`,
        checkOutDate: `2099-03-${fixture.day + 1}`,
        totalAmount: '1000000',
        status: fixture.status,
        holdExpiresAt: fixture.holdExpiresAt,
      }),
    );
    const andWhere = jest.spyOn(builder, 'andWhere');
    const getMany = jest
      .spyOn(builder, 'getMany')
      .mockResolvedValue(
        bookings.filter(
          (booking) => !['CANCELLED', 'REFUNDED'].includes(booking.status),
        ),
      );
    expect(await service.getBookedDateRanges('room-1')).toEqual([
      { checkInDate: '2099-03-10', checkOutDate: '2099-03-11' },
      { checkInDate: '2099-03-12', checkOutDate: '2099-03-13' },
      { checkInDate: '2099-03-20', checkOutDate: '2099-03-21' },
    ]);
    expect(andWhere).toHaveBeenCalledWith(
      "booking.status NOT IN ('CANCELLED', 'REFUNDED')",
    );
    getMany.mockResolvedValue([bookings[0]]);
    expect(
      await service.isRoomAvailable('room-1', '2099-03-10', '2099-03-11'),
    ).toBe(false);
    getMany.mockResolvedValue([]);
    expect(
      await service.isRoomAvailable('room-1', '2099-03-11', '2099-03-12'),
    ).toBe(true);
    getMany.mockResolvedValue([bookings[2]]);
    expect(
      await service.isRoomAvailable('room-1', '2099-03-14', '2099-03-15'),
    ).toBe(true);
  });
});
