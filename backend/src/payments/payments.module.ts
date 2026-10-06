import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../database/entities/booking.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { PaymentEntity } from '../database/entities/payment.entity';
import { PaymentEventEntity } from '../database/entities/payment-event.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { RoomEntity } from '../database/entities/room.entity';
import { UserEntity } from '../database/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      PaymentEntity,
      PaymentEventEntity,
      PasswordResetTokenEntity,
      RoleEntity,
      RoomEntity,
      UserEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
  exports: [PaymentsService, PaymentGatewayService],
})
export class PaymentsModule {}
