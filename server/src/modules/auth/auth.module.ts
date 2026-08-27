import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp/otp.service';
import { TokenService } from './token/token.service';
import { JwtStrategy } from './token/jwt.strategy';
import { SMS_PROVIDER } from './sms/sms-provider.interface';
import { StubSmsProvider } from './sms/stub-sms.provider';
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
    { provide: SMS_PROVIDER, useClass: StubSmsProvider },
  ],
  exports: [TokenService, SMS_PROVIDER],
})
export class AuthModule {}
