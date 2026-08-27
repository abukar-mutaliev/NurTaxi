import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserResponse } from '../users/dto/user.presenter';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { OtpService } from './otp/otp.service';
import { TokenService, type TokenPair } from './token/token.service';
import { AuthEventsService } from './auth-events.service';
import { AuthEventType } from '../../common/enums/compliance.enum';

export interface AuthResult extends TokenPair {
  user: UserResponse;
  isNewUser: boolean;
  requiresConsent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly authEvents: AuthEventsService,
  ) {}

  requestOtp(phone: string) {
    return this.otpService.request(phone);
  }

  /**
   * Подтверждение кода: единый флоу регистрации/входа (Req §8.1).
   * Новому номеру создаётся клиентский аккаунт.
   */
  async verifyOtp(
    phone: string,
    code: string,
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<AuthResult> {
    try {
      await this.otpService.verify(phone, code);
    } catch (error) {
      this.authEvents.record({
        type: AuthEventType.LoginFailure,
        success: false,
        phone,
        ipAddress: meta?.ip,
        userAgent: meta?.userAgent,
      });
      throw error;
    }

    const { user, isNew } = await this.usersService.findOrCreateClient(phone);
    const tokens = await this.tokenService.issueForUser({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });

    this.authEvents.record({
      type: AuthEventType.LoginSuccess,
      success: true,
      userId: user.id,
      phone,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return {
      ...tokens,
      user: UserResponse.from(user),
      isNewUser: isNew,
      requiresConsent: user.pdnConsentAt === null,
    };
  }

  async refresh(refreshToken: string, meta?: { ip?: string | null; userAgent?: string | null }): Promise<TokenPair> {
    const tokens = await this.tokenService.rotate(refreshToken, async (id) => {
      const user = await this.usersService.getByIdOrThrow(id);
      const authUser: AuthenticatedUser = { id: user.id, role: user.role, phone: user.phone };
      return authUser;
    });
    this.authEvents.record({
      type: AuthEventType.TokenRefresh,
      success: true,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });
    return tokens;
  }

  async logout(refreshToken: string, meta?: { ip?: string | null; userAgent?: string | null }): Promise<void> {
    await this.tokenService.revoke(refreshToken);
    this.authEvents.record({
      type: AuthEventType.Logout,
      success: true,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
      payload: { revoke: true },
    });
  }
}
