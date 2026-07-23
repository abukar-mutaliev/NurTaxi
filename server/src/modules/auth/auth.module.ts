import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { TokenService } from './token/token.service';
import { JwtStrategy } from './token/jwt.strategy';
import { SMS_PROVIDER } from './sms/sms-provider.interface';
import { StubSmsProvider } from './sms/stub-sms.provider';

/**
 * Auth & Users (Des §2.3, §9): OTP-регистрация, JWT (access/refresh с ротацией),
 * защита OTP от перебора, RBAC. Секреты/TTL берутся из конфигурации per-call,
 * поэтому JwtModule регистрируется без глобального секрета.
 */
@Module({
  imports: [forwardRef(() => UsersModule), PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    { provide: SMS_PROVIDER, useClass: StubSmsProvider },
  ],
  exports: [TokenService, SMS_PROVIDER],
})
export class AuthModule {}
