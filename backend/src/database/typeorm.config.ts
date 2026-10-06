import { mkdirSync } from 'fs';
import { join } from 'path';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { AmenityEntity } from './entities/amenity.entity';
import { BookingEntity } from './entities/booking.entity';
import { EmailLogEntity } from './entities/email-log.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentEventEntity } from './entities/payment-event.entity';
import { RoleEntity } from './entities/role.entity';
import { RoomImageEntity } from './entities/room-image.entity';
import { RoomEntity } from './entities/room.entity';
import { UserEntity } from './entities/user.entity';
import { InitPublicAuthRooms1721800000000 } from './migrations/1721800000000-init-public-auth-rooms';
import { AddBookingPaymentEmail1721810000000 } from './migrations/1721810000000-add-booking-payment-email';
import { AddRoomPassword1721820000000 } from './migrations/1721820000000-add-room-password';

const entities = [
  RoleEntity,
  UserEntity,
  PasswordResetTokenEntity,
  AmenityEntity,
  RoomEntity,
  RoomImageEntity,
  BookingEntity,
  PaymentEntity,
  PaymentEventEntity,
  EmailLogEntity,
];

const migrations = [
  InitPublicAuthRooms1721800000000,
  AddBookingPaymentEmail1721810000000,
  AddRoomPassword1721820000000,
];

function getSqlJsLocation() {
  const folder = join(process.cwd(), '.data');
  mkdirSync(folder, { recursive: true });
  return join(folder, 'oni-homstay.sqlite');
}

export function getTypeOrmOptions(): TypeOrmModuleOptions & DataSourceOptions {
  const databaseType = (process.env.DB_TYPE ?? 'postgres').toLowerCase();
  const isTest = process.env.NODE_ENV === 'test';

  if (databaseType === 'postgres') {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: false,
      entities,
      migrations,
      migrationsRun: true,
      synchronize: false,
      ssl:
        process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }

  return {
    type: 'sqljs',
    database: isTest ? new Uint8Array() : undefined,
    location: isTest ? undefined : getSqlJsLocation(),
    autoSave: !isTest,
    autoLoadEntities: false,
    entities,
    migrations,
    migrationsRun: true,
    synchronize: false,
  };
}

export const typeOrmEntities = entities;
export const typeOrmMigrations = migrations;
