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
import { CancelOrderDto, CreateOrderDto, GeoLocationDto, OrderEstimateDto } from './dto/orders.dto';
import {
  ConfirmTripRecordingDto,
  PresignTripRecordingDto,
  TripRecordingResponse,
} from './dto/trip-recording.dto';
import { OrderEstimateResponse, OrderHistoryResponse, OrderResponse } from './dto/orders.presenter';
import { OrdersService } from './orders.service';
import { TripRecordingService } from './trip-recording.service';
import { SosService } from '../sos/sos.service';
import { ReviewsService } from '../reviews/reviews.service';
import { CreateReviewDto, ReviewResponse } from '../reviews/dto/reviews.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly sosService: SosService,
    private readonly reviewsService: ReviewsService,
    private readonly tripRecordingService: TripRecordingService,
  ) {}

  @Post('estimate')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Расчёт маршрута и стоимости (Req §8.10)' })
  estimate(@Body() dto: OrderEstimateDto): Promise<OrderEstimateResponse> {
    return this.ordersService.estimate(dto);
  }

  @Post()
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Создание заказа (Req §8.10, §8.11)' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.create(user.id, dto);
    return OrderResponse.from(order);
  }

  @Get('history')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'История поездок клиента (Req §8.13)' })
  async history(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: number,
  ): Promise<OrderHistoryResponse[]> {
    const items = await this.ordersService.getClientHistory(user.id, limit ? Number(limit) : 20);
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

  @Get(':id')
  @Roles(Role.Client, Role.Driver)
  @ApiOperation({ summary: 'Детали заказа' })
  async getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderResponse> {
    const role = user.role === Role.Driver ? 'driver' : 'client';
    const order = await this.ordersService.getOrderForUser(user.id, id, role);
    return OrderResponse.from(order);
  }

  @Post(':id/sos')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Активация SOS (Req §8.7)' })
  async activateSos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GeoLocationDto,
  ) {
    const event = await this.sosService.activate(user.id, id, {
      lat: dto.lat,
      lng: dto.lng,
    });
    return {
      success: true,
      sosEventId: event.id,
      contactsNotified: event.contactsNotified,
      activatedAt: event.createdAt.toISOString(),
    };
  }

  @Get(':id/recordings')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Список аудиозаписей поездки' })
  async listRecordings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TripRecordingResponse[]> {
    const items = await this.tripRecordingService.listForOrder(user.id, id);
    return items.map((item) => TripRecordingResponse.from(item));
  }

  @Post(':id/recordings/presign')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Presigned URL для загрузки аудиозаписи поездки' })
  async presignRecording(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PresignTripRecordingDto,
  ) {
    return this.tripRecordingService.createUploadUrl(user.id, id, dto);
  }

  @Post(':id/recordings/confirm')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Подтверждение загрузки аудиозаписи поездки' })
  async confirmRecording(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmTripRecordingDto,
  ): Promise<TripRecordingResponse> {
    const record = await this.tripRecordingService.confirmUpload(user.id, id, dto);
    return TripRecordingResponse.from(record);
  }

  @Post(':id/review')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Оценка и отзыв (Req §8.14)' })
  async review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponse> {
    const review = await this.reviewsService.createClientReview(user.id, id, dto);
    return ReviewResponse.from(review);
  }

  @Post(':id/cancel')
  @Roles(Role.Client)
  @ApiOperation({ summary: 'Отмена заказа клиентом (Req §8.12)' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ): Promise<OrderResponse> {
    const order = await this.ordersService.cancelByClient(user.id, id, dto.reason);
    return OrderResponse.from(order);
  }
}
