import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserResponse } from '../users/dto/user.presenter';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { OtpService, type OtpRequestResult } from './otp/otp.service';
import { TokenService, type TokenPair } from './token/token.service';
import { AuthEventsService } from './auth-events.service';
import { AuthEventType } from '../../common/enums/compliance.enum';
import { MobileIdService, type MobileIdRequestResult } from './mobile-id/mobile-id.service';
import type { MobileIdChallengeStatus } from './mobile-id/mobile-id.status';

export interface AuthResult extends TokenPair {
  user: UserResponse;
  isNewUser: boolean;
  requiresConsent: boolean;
}

export type AuthChallenge =
  (OtpRequestResult & { method: 'sms'; status: 'otp_required' }) | MobileIdRequestResult;

export type AuthStatusResult =
  | { method: 'sms'; status: 'otp_required' }
  | { method: 'mobile-id'; status: Exclude<MobileIdChallengeStatus, 'confirmed'> }
  | (AuthResult & { method: 'mobile-id'; status: 'confirmed' });

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly mobileId: MobileIdService,
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
    private readonly authEvents: AuthEventsService,
  ) {}

  async requestOtp(phone: string): Promise<AuthChallenge> {
    if (this.mobileId.isEnabled()) {
      try {
        return await this.mobileId.request(phone);
      } catch (error) {
        // Неверный callback или имя отправителя не должны оставлять вход в 503:
        // SMS Aero всё ещё может доставить обычный код.
        if (error instanceof ServiceUnavailableException) {
          this.logger.warn('Mobile ID не запустил проверку, отправляем SMS-код');
          return this.requestSms(phone);
        }
        throw error;
      }
    }
    return this.requestSms(phone);
  }

  private requestSms(phone: string): Promise<AuthChallenge> {
    return this.otpService.request(phone).then((result) => ({
      ...result,
      method: 'sms' as const,
      status: 'otp_required' as const,
    }));
  }

  /**
   * Опрос SIM-push. Когда абонент подтвердил запрос на телефоне,
   * ответ совпадает с `otp/verify` и сразу содержит токены.
   */
  async pollOtp(phone: string, meta?: RequestMeta): Promise<AuthStatusResult> {
    if (!this.mobileId.isEnabled()) {
      return { method: 'sms', status: 'otp_required' };
    }

    const status = await this.mobileId.refresh(phone);
    if (status !== 'confirmed') {
      return { method: 'mobile-id', status };
    }

    const claimed = await this.mobileId.claimConfirmed(phone);
    if (!claimed) {
      return { method: 'mobile-id', status: 'failed' };
    }
    const auth = await this.completeLogin(phone, meta);
    return { ...auth, method: 'mobile-id', status: 'confirmed' };
  }

  applyMobileIdCallback(
    token: string,
    body: { id: number; status: number; number: string },
  ): Promise<void> {
    return this.mobileId.applyCallback(token, body);
  }

  /**
   * Подтверждение кода: единый флоу регистрации/входа (Req §8.1).
   * Новому номеру создаётся клиентский аккаунт.
   */
  async verifyOtp(phone: string, code: string, meta?: RequestMeta): Promise<AuthResult> {
    try {
      // После отката Mobile ID код лежит в Redis OTP, сессии Mobile ID нет.
      if (this.mobileId.isEnabled() && (await this.mobileId.hasSession(phone))) {
        await this.mobileId.verifyCode(phone, code);
        const claimed = await this.mobileId.claimConfirmed(phone);
        if (!claimed) {
          throw new BadRequestException({
            code: 'OTP_EXPIRED',
            message: 'Код не найден или истёк. Запросите новый',
          });
        }
      } else {
        await this.otpService.verify(phone, code);
      }
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

    return this.completeLogin(phone, meta);
  }

  private async completeLogin(phone: string, meta?: RequestMeta): Promise<AuthResult> {
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

  async refresh(
    refreshToken: string,
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<TokenPair> {
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

  async logout(
    refreshToken: string,
    meta?: { ip?: string | null; userAgent?: string | null },
  ): Promise<void> {
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
