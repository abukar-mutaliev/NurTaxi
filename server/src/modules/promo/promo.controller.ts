import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { PromoService } from './promo.service';

class RedeemPromoDto {
  @IsUUID()
  regionId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(32)
  code!: string;
}

@ApiTags('promo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Client)
@Controller('me/promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Бонусный баланс (Req §8.3)' })
  getBalance(@CurrentUser() user: AuthenticatedUser) {
    return this.promoService.getBalance(user.id);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Активация промокода (§8.6)' })
  redeem(@CurrentUser() user: AuthenticatedUser, @Body() dto: RedeemPromoDto) {
    return this.promoService.redeem(user.id, dto.regionId, dto.code);
  }
}
