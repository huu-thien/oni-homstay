import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { verifySignedToken } from '../token.util';

type RequestWithUser = Request & {
  user?: {
    id: string;
    email: string;
    role: string;
    scope: string;
  };
};

@Injectable()
export class AccessTokenAuthGuard implements CanActivate {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET ?? 'oni-homstay-access-local-secret';

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu access token.');
    }

    const token = authorizationHeader.replace('Bearer ', '');
    const payload = verifySignedToken(token, this.accessTokenSecret);

    if (!payload || payload.scope !== 'access') {
      throw new UnauthorizedException('Access token không hợp lệ.');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tài khoản không còn hợp lệ.');
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role.code,
      scope: payload.scope,
    };

    return true;
  }
}
