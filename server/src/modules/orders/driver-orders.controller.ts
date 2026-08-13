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
import { CancelOrderDto, DriverOrderActionDto } from './dto/orders.dto';
import { OrderHistoryResponse, OrderResponse } from './dto/orders.presenter';
import { OrdersService } from './orders.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto, ReviewResponse } from '../reviews/dto/reviews.dto';

@ApiTags('driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Driver)
@Controller('driver/orders')
export class DriverOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get('history')
  @ApiOperation({ summary: 'История поездок водителя (Req §8.13)' })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ): Promise<OrderHistoryResponse[]> {
    const items = await this.ordersService.getDriverHistory(user.id, limit ? Number(limit) : 20);
    return items.map((item) =>
      OrderHistoryResponse.from({
        order: item.order,
        receipt: item.receipt,
        reviews: item.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          target: r.target,
          text: r.text,
        })),
      }),
    );
  }

  @Get('offer')
  @ApiOperation({
    summary: 'Предложение, ожидающее ответа водителя (Req §15.3)',
    description:
      'Событие `order.offer` по WebSocket уходит один раз. Свёрнутое приложение на Android ' +
      'теряет сокет за считаные секунды и предложение не получает, поэтому вернувшись на ' +
      'передний план оно спрашивает сервер само. `null` — ждать нечего.',
  })
  async pendingOffer(@CurrentUser() user: AuthenticatedUser): Promise<Record<string, unknown> | null> {
    return this.ordersService.getPendingOfferForDriver(user.id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Принятие заказа (Req §8.10, Des §6)' })
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.acceptOrder(user.id, id);
    return OrderResponse.from(order);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Обновление статуса поездки водителем' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DriverOrderActionDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.advanceDriverStatus(user.id, id, dto.action);
    return OrderResponse.from(order);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Отмена заказа водителем (Req §8.12)' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.cancelByDriver(user.id, id, dto.reason);
    return OrderResponse.from(order);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Оценка клиента водителем (Req §8.14)' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const review = await this.reviewsService.createDriverReview(user.id, id, dto);
    return ReviewResponse.from(review);
  }
}
