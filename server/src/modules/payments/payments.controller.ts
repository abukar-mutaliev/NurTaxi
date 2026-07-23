import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Role } from '../../common/enums/role.enum';
import { PaymentsService } from './payments.service';
import { PayoutService } from './payout.service';
import { PayoutResponse, ReceiptResponse, RequestPayoutDto } from './dto/payments.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly payoutService: PayoutService,
  ) {}

  @Get('orders/:id/receipt')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Электронный чек по поездке (Req §8.13, §22)' })
  async getReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) orderId: string,
  ): Promise<ReceiptResponse> {
    const receipt = await this.paymentsService.getReceiptForClient(user.id, orderId);
    return ReceiptResponse.from(receipt);
  }

  @Post('driver/payouts')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'Вывод средств водителем (Req §8.4, §22)' })
  async requestPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestPayoutDto,
  ): Promise<PayoutResponse> {
    const payout = await this.payoutService.requestPayout(user.id, dto.amount, dto.idempotencyKey);
    return PayoutResponse.from(payout);
  }

  @Get('driver/payouts')
  @Roles(Role.Driver)
  @ApiOperation({ summary: 'История выводов средств' })
  async listPayouts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ): Promise<PayoutResponse[]> {
    const payouts = await this.payoutService.listDriverPayouts(user.id, limit ? Number(limit) : 20);
    return payouts.map(PayoutResponse.from);
  }
}
