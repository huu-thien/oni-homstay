import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { RoomEntity } from '../database/entities/room.entity';
import { RoomImageEntity } from '../database/entities/room-image.entity';
import { AmenityEntity } from '../database/entities/amenity.entity';
import { BookingEntity } from '../database/entities/booking.entity';
import { StorageModule } from '../storage/storage.module';
import { AccessTokenAuthGuard } from '../auth/guards/access-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      RoomEntity,
      RoomImageEntity,
      AmenityEntity,
      BookingEntity,
    ]),
    StorageModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AccessTokenAuthGuard, RolesGuard],
})
export class AdminModule {}
