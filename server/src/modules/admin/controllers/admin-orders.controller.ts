import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/auth/roles.guard';
import { Roles } from '../../../common/auth/roles.decorator';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/auth/jwt-payload.interface';
import { Role } from '../../../common/enums/role.enum';
import { OrderStatus } from '../../../common/enums/order-status.enum';
import { OrderResponse } from '../../orders/dto/orders.presenter';
import { AdminOrdersService } from '../admin-orders.service';
import { AdminAssignDriverDto, AdminOrderStatusDto, AdminRefundDto } from '../dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Operator, Role.RegionalAdmin, Role.SuperAdmin)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrders: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Список заказов (операторская консоль, §7.4)' })
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('regionId') regionId?: string,
    @Query('status') status?: OrderStatus,
    @Query('limit') limit?: number,
  ): Promise<OrderResponse[]> {
    const orders = await this.adminOrders.listOrders(actor, {
      regionId,
      status,
      limit: limit ? Number(limit) : 50,
    });
    return orders.map(OrderResponse.from);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали заказа' })
  async getOne(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    const order = await this.adminOrders.getOrder(actor, id);
    return OrderResponse.from(order);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Ручное назначение водителя (§7.4)' })
  async assign(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminAssignDriverDto,
  ): Promise<OrderResponse> {
    const order = await this.adminOrders.assignDriver(actor, id, dto.driverId);
    return OrderResponse.from(order);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Изменение статуса заказа оператором' })
  async changeStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminOrderStatusDto,
  ): Promise<OrderResponse> {
    const order = await this.adminOrders.changeStatus(actor, id, dto);
    return OrderResponse.from(order);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Возврат/компенсация (§7.4)' })
  async refund(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRefundDto,
  ): Promise<{ success: true; orderId: string }> {
    await this.adminOrders.refund(actor, id, dto);
    return { success: true, orderId: id };
  }
}
