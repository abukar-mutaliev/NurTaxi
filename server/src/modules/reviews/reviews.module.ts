import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { DriversModule } from '../drivers/drivers.module';
import { Review } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Order]), forwardRef(() => DriversModule)],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
