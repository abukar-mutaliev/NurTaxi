import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { ReviewTarget } from '../../common/enums/phase8.enum';
import { EventBusService } from '../../messaging/event-bus.service';
import { Order } from '../orders/entities/order.entity';
import { DriversService } from '../drivers/drivers.service';
import { Review } from './entities/review.entity';
import type { CreateReviewDto } from './dto/reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    private readonly driversService: DriversService,
    private readonly eventBus: EventBusService,
  ) {}

  async createClientReview(
    clientId: string,
    orderId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const order = await this.getClosedOrder(orderId);
    if (order.clientId !== clientId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Это не ваш заказ' });
    }

    const review = await this.saveReview({
      order,
      authorId: clientId,
      target: ReviewTarget.Driver,
      dto,
    });

    if (order.driverId) {
      await this.recalculateDriverRating(order.driverId);
    }

    this.eventBus.publish('review.created', { orderId, reviewId: review.id, target: 'driver' });
    return review;
  }

  async createDriverReview(
    driverUserId: string,
    orderId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const driver = await this.driversService.getProfileByUserId(driverUserId);
    const order = await this.getClosedOrder(orderId);

    if (order.driverId !== driver.id) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Это не ваш заказ' });
    }

    const review = await this.saveReview({
      order,
      authorId: driverUserId,
      target: ReviewTarget.Client,
      dto,
    });

    this.eventBus.publish('review.created', { orderId, reviewId: review.id, target: 'client' });
    return review;
  }

  listForOrder(orderId: string): Promise<Review[]> {
    return this.reviews.find({ where: { orderId }, order: { createdAt: 'ASC' } });
  }

  private async getClosedOrder(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'Заказ не найден' });
    }
    if (order.status !== OrderStatus.Closed) {
      throw new ConflictException({
        code: 'REVIEW_NOT_ALLOWED',
        message: 'Отзыв доступен после закрытия поездки',
      });
    }
    return order;
  }

  private async saveReview(params: {
    order: Order;
    authorId: string;
    target: ReviewTarget;
    dto: CreateReviewDto;
  }): Promise<Review> {
    const existing = await this.reviews.findOne({
      where: { orderId: params.order.id, authorId: params.authorId },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REVIEW_EXISTS',
        message: 'Вы уже оставили отзыв по этой поездке',
      });
    }

    return this.reviews.save(
      this.reviews.create({
        orderId: params.order.id,
        authorId: params.authorId,
        target: params.target,
        rating: params.dto.rating,
        text: params.dto.text ?? null,
        tags: params.dto.tags ?? [],
        isComplaint: params.dto.isComplaint ?? false,
      }),
    );
  }

  private async recalculateDriverRating(driverId: string): Promise<void> {
    const rows = await this.reviews
      .createQueryBuilder('r')
      .innerJoin('r.order', 'o')
      .where('o.driver_id = :driverId', { driverId })
      .andWhere('r.target = :target', { target: ReviewTarget.Driver })
      .select('AVG(r.rating)', 'avg')
      .getRawOne<{ avg: string | null }>();

    const avg = rows?.avg ? Number(rows.avg) : 5;
    await this.driversService.updateRating(driverId, avg);
  }
}
