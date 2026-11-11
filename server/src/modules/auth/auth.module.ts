import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SmsConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { TokenService } from './token/token.service';
import { JwtStrategy } from './token/jwt.strategy';
import { SMS_PROVIDER } from './sms/sms-provider.interface';
import { StubSmsProvider } from './sms/stub-sms.provider';
import { SmsAeroClient } from './sms/smsaero.client';
import { SmsAeroSmsProvider } from './sms/smsaero-sms.provider';
import { MobileIdService } from './mobile-id/mobile-id.service';
import { AuthEventLog } from './entities/auth-event-log.entity';
import { AuthEventsService } from './auth-events.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([AuthEventLog]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    TokenService,
    JwtStrategy,
    AuthEventsService,
    MobileIdService,
    {
      provide: SmsAeroClient,
      useFactory: (config: ConfigService) => new SmsAeroClient(config.get<SmsConfig>('sms')!),
      inject: [ConfigService],
    },
    {
      provide: SMS_PROVIDER,
      useFactory: (config: ConfigService, client: SmsAeroClient) => {
        const sms = config.get<SmsConfig>('sms');
        return sms?.provider === 'smsaero' ? new SmsAeroSmsProvider(client) : new StubSmsProvider();
      },
      inject: [ConfigService, SmsAeroClient],
    },
  ],
  exports: [TokenService, SMS_PROVIDER],
})
export class AuthModule {}
