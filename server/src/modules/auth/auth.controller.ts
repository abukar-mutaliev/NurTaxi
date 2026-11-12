import { Body, Controller, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
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
  @ApiOperation({ summary: 'Начать вход: Mobile ID, иначе SMS-код' })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Подтверждение кода и выдача токенов' })
  verifyOtp(@Body() dto: OtpVerifyDto, @Req() req: Request) {
    return this.authService.verifyOtp(dto.phone, dto.code, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('otp/status')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Статус Mobile ID. При подтверждении SIM-push сразу возвращает токены',
  })
  otpStatus(@Body() dto: OtpRequestDto, @Req() req: Request) {
    return this.authService.pollOtp(dto.phone, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('mobile-id/callback')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @ApiOperation({ summary: 'Вебхук SMS Aero со статусом Mobile ID' })
  async mobileIdCallback(@Query('token') token = '', @Req() req: Request) {
    const body = (req.body ?? {}) as { id?: unknown; status?: unknown; number?: unknown };
    const id = Number(body.id);
    const status = Number(body.status);
    const number = body.number == null ? '' : String(body.number).trim();
    if (!Number.isInteger(id) || !Number.isInteger(status) || !number) {
      return { success: true };
    }
    await this.authService.applyMobileIdCallback(token, { id, status, number });
    return { success: true };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access-токена (ротация refresh)' })
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход (отзыв refresh-токена)' })
  async logout(@Body() dto: LogoutDto, @Req() req: Request) {
    await this.authService.logout(dto.refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    });
    return { success: true };
  }
}
