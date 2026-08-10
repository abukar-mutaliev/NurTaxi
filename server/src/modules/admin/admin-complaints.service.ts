import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../common/auth/jwt-payload.interface';
import { Review } from '../reviews/entities/review.entity';
import { AdminScopeService } from './admin-scope.service';
import type { AdminComplaintResponse } from './dto/admin-complaints.dto';

@Injectable()
export class AdminComplaintsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviews: Repository<Review>,
    private readonly scope: AdminScopeService,
  ) {}

  async list(actor: AuthenticatedUser, queryRegionId?: string): Promise<AdminComplaintResponse[]> {
    const regionId = await this.scope.resolveListRegionId(actor, queryRegionId);

    const qb = this.reviews
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.order', 'o')
      .innerJoinAndSelect('r.author', 'a')
      .where('r.is_complaint = true')
      .orderBy('r.created_at', 'DESC')
      .take(100);

    if (regionId) {
      qb.andWhere('o.region_id = :regionId', { regionId });
    }

    const rows = await qb.getMany();

    return rows.map((review) => ({
      id: review.id,
      orderId: review.orderId,
      regionId: review.order.regionId,
      authorId: review.authorId,
      authorName: review.author.name,
      authorPhone: review.author.phone,
      target: review.target,
      rating: review.rating,
      text: review.text,
      tags: review.tags,
      createdAt: review.createdAt.toISOString(),
      orderPickupAddress: review.order.pickupAddress ?? null,
      orderStatus: review.order.status ?? null,
    }));
  }
}
