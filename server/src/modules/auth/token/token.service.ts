import { randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.constants';
import type { JwtConfig } from '../../../config/configuration';
import type {
  AuthenticatedUser,
  JwtPayload,
  RefreshPayload,
} from '../../../common/auth/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

/**
 * Выпуск и ротация JWT (Des §9). Access — короткоживущий; refresh — с ротацией:
 * при каждом обновлении старый jti инвалидируется, что защищает от повторного
 * использования украденного refresh-токена.
 */
@Injectable()
export class TokenService {
  private readonly jwtConfig: JwtConfig;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');
  }

  async issueForUser(user: AuthenticatedUser): Promise<TokenPair> {
    const accessPayload: JwtPayload = { sub: user.id, role: user.role, phone: user.phone };
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshPayload = { sub: user.id, jti };
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.jwtConfig.refreshSecret,
      expiresIn: this.jwtConfig.refreshTtl,
    });

    await this.redis.set(this.refreshKey(user.id, jti), '1', 'EX', this.jwtConfig.refreshTtl);

    return { accessToken, refreshToken, expiresInSec: this.jwtConfig.accessTtl };
  }

  /**
   * Проверяет refresh-токен, инвалидирует его jti и выдаёт новую пару (ротация).
   */
  async rotate(refreshToken: string, resolveUser: (id: string) => Promise<AuthenticatedUser>) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Недействительный refresh-токен',
      });
    }

    const key = this.refreshKey(payload.sub, payload.jti);
    const exists = await this.redis.del(key);
    if (exists === 0) {
      // jti уже использован/отозван — возможная попытка повторного использования.
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH',
        message: 'Refresh-токен уже использован или отозван',
      });
    }

    const user = await resolveUser(payload.sub);
    return this.issueForUser(user);
  }

  async revoke(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.jwtConfig.refreshSecret,
      });
      await this.redis.del(this.refreshKey(payload.sub, payload.jti));
    } catch {
      // Токен уже недействителен — logout идемпотентен.
    }
  }

  private refreshKey(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }
}
