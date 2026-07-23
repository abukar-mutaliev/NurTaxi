import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '../../common/enums/user-status.enum';
import type { AuthenticatedUser, JwtPayload } from '../../common/auth/jwt-payload.interface';
import type { JwtConfig } from '../../config/configuration';
import { UsersService } from '../users/users.service';

@Injectable()
export class WsAuthService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');
  }

  async authenticate(token: string | undefined): Promise<AuthenticatedUser> {
    if (!token?.trim()) {
      throw new UnauthorizedException({ code: 'WS_UNAUTHORIZED', message: 'Токен не передан' });
    }

    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(raw, {
        secret: this.jwtConfig.accessSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'WS_UNAUTHORIZED',
        message: 'Недействительный токен',
      });
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException({
        code: 'WS_UNAUTHORIZED',
        message: 'Пользователь недоступен',
      });
    }

    return { id: user.id, role: user.role, phone: user.phone };
  }
}
