import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { PaymentsModule } from './payments/payments.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    AdminModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
