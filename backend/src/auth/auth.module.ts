import { Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthController } from './auth.controller';
import { AccessTokenAuthGuard } from './guards/access-token-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      UserEntity,
      PasswordResetTokenEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenAuthGuard, RolesGuard, Reflector],
  exports: [AuthService, AccessTokenAuthGuard, RolesGuard],
})
export class AuthModule {}
