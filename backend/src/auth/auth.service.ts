import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { successResponse } from '../common/api-response';
import { PasswordResetTokenEntity } from '../database/entities/password-reset-token.entity';
import { RoleEntity } from '../database/entities/role.entity';
import { UserEntity } from '../database/entities/user.entity';
import { MailerService } from '../notifications/mailer.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from './password.util';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { createSignedToken } from './token.util';

@Injectable()
export class AuthService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET ?? 'oni-homstay-access-local-secret';
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET ?? 'oni-homstay-refresh-local-secret';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokenRepository: Repository<PasswordResetTokenEntity>,
    private readonly mailerService: MailerService,
  ) {}

  async register(payload: RegisterDto) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const normalizedPhone = payload.phone.trim();

    const hasExistingUser = await this.userRepository.findOne({
      where: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (hasExistingUser) {
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại.');
    }

    const customerRole = await this.roleRepository.findOneByOrFail({
      code: 'CUSTOMER',
    });

    const user = this.userRepository.create({
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash: hashPassword(payload.password),
      role: customerRole,
      status: 'ACTIVE',
    });

    const savedUser = await this.userRepository.save(user);

    return successResponse(
      {
        accessToken: this.createToken(savedUser),
        refreshToken: this.createToken(savedUser, 'refresh'),
        user: this.toUserResponse(savedUser),
      },
      'Đăng ký tài khoản thành công.',
    );
  }

  async login(payload: LoginDto) {
    const identifier = payload.identifier.trim().toLowerCase();
    const rawIdentifier = payload.identifier.trim();
    const resolvedEmailIdentifier =
      identifier === 'admin' ? 'admin@onihomstay.vn' : identifier;
    const user = await this.userRepository.findOne({
      where: [{ email: resolvedEmailIdentifier }, { phone: rawIdentifier }],
    });

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu.');
    }

    return successResponse(
      {
        accessToken: this.createToken(user),
        refreshToken: this.createToken(user, 'refresh'),
        user: this.toUserResponse(user),
      },
      'Đăng nhập thành công.',
    );
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      const token = randomBytes(24).toString('hex');
      await this.passwordResetTokenRepository.save(
        this.passwordResetTokenRepository.create({
          user,
          token,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
          usedAt: null,
        }),
      );
      await this.mailerService.sendResetPasswordEmail({
        recipient: user.email,
        fullName: user.fullName,
        resetToken: token,
        user,
      });
    }

    return successResponse(
      {
        sent: true,
      },
      'Nếu email tồn tại, hệ thống đã gửi hướng dẫn đặt lại mật khẩu.',
    );
  }

  async resetPassword(payload: ResetPasswordDto) {
    const resetRecord = await this.passwordResetTokenRepository.findOne({
      where: { token: payload.token },
      relations: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt ||
      new Date(resetRecord.expiresAt).getTime() < Date.now()
    ) {
      throw new UnprocessableEntityException(
        'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      );
    }

    const { user } = resetRecord;

    if (!user) {
      throw new UnprocessableEntityException('Tài khoản không tồn tại.');
    }

    user.passwordHash = hashPassword(payload.password);
    resetRecord.usedAt = new Date().toISOString();
    await this.userRepository.save(user);
    await this.passwordResetTokenRepository.save(resetRecord);

    return successResponse(
      {
        updated: true,
      },
      'Đặt lại mật khẩu thành công.',
    );
  }

  private toUserResponse(user: UserEntity) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role.code,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private createToken(
    user: UserEntity,
    scope: 'access' | 'refresh' = 'access',
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
      scope,
      iat: Date.now(),
    };
    return createSignedToken(
      payload,
      scope === 'access' ? this.accessTokenSecret : this.refreshTokenSecret,
    );
  }
}
