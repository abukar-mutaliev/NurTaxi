import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LogoutDto, OtpRequestDto, OtpVerifyDto, RefreshDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  // Дополнительный сетевой rate limit поверх Redis-логики (защита OTP, Req §20).
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Запрос SMS-кода' })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Подтверждение кода и выдача токенов' })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access-токена (ротация refresh)' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход (отзыв refresh-токена)' })
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true };
  }
}
