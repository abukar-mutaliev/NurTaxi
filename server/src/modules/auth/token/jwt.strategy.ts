import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '../../../common/enums/user-status.enum';
import type { AuthenticatedUser, JwtPayload } from '../../../common/auth/jwt-payload.interface';
import type { JwtConfig } from '../../../config/configuration';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<JwtConfig>('jwt').accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Пользователь не найден или заблокирован',
      });
    }
    return { id: user.id, role: user.role, phone: user.phone };
  }
}
