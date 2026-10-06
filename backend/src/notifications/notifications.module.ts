import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../database/entities/booking.entity';
import { EmailLogEntity } from '../database/entities/email-log.entity';
import { UserEntity } from '../database/entities/user.entity';
import { MailerService } from './mailer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLogEntity, BookingEntity, UserEntity]),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class NotificationsModule {}
