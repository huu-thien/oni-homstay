import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../database/entities/booking.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { RoomEntity } from '../database/entities/room.entity';
import { UserEntity } from '../database/entities/user.entity';
import { PaymentsModule } from '../payments/payments.module';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      PaymentEntity,
      RoleEntity,
      RoomEntity,
      UserEntity,
    ]),
    PaymentsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingAvailabilityService],
  exports: [BookingAvailabilityService],
})
export class BookingsModule {}
