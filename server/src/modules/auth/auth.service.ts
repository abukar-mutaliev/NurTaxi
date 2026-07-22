import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserResponse } from '../users/dto/user.presenter';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { OtpService } from './otp/otp.service';
import { TokenService, type TokenPair } from './token/token.service';

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
  ) {}

  requestOtp(phone: string) {
    return this.otpService.request(phone);
  }

  /**
   * Подтверждение кода: единый флоу регистрации/входа (Req §8.1).
   * Новому номеру создаётся клиентский аккаунт.
   */
  async verifyOtp(phone: string, code: string): Promise<AuthResult> {
    await this.otpService.verify(phone, code);

    const { user, isNew } = await this.usersService.findOrCreateClient(phone);
    const tokens = await this.tokenService.issueForUser({
      id: user.id,
      role: user.role,
      phone: user.phone,
    });

    return {
      ...tokens,
      user: UserResponse.from(user),
      isNewUser: isNew,
      requiresConsent: user.pdnConsentAt === null,
    };
  }

  refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.rotate(refreshToken, async (id) => {
      const user = await this.usersService.getByIdOrThrow(id);
      const authUser: AuthenticatedUser = { id: user.id, role: user.role, phone: user.phone };
      return authUser;
    });
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokenService.revoke(refreshToken);
  }
}
