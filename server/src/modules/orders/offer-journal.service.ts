import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferOutcome } from '../../common/enums/compliance.enum';
import { OrderOfferLog } from './entities/order-offer-log.entity';

const DEFAULT_TIMEOUT_SEC = 30;

@Injectable()
export class OfferJournalService {
  constructor(
    @InjectRepository(OrderOfferLog)
    private readonly logs: Repository<OrderOfferLog>,
  ) {}

  async recordOffered(
    orderId: string,
    driverId: string,
    timeoutSec = DEFAULT_TIMEOUT_SEC,
  ): Promise<OrderOfferLog> {
    const offeredAt = new Date();
    return this.logs.save(
      this.logs.create({
        orderId,
        driverId,
        offeredAt,
        timeoutSec,
        expiresAt: new Date(offeredAt.getTime() + timeoutSec * 1000),
        outcome: OfferOutcome.Pending,
        assigned: false,
      }),
    );
  }

  async resolvePending(
    orderId: string,
    driverId: string,
    outcome: OfferOutcome,
    assigned = false,
  ): Promise<void> {
    const pending = await this.logs.findOne({
      where: { orderId, driverId, outcome: OfferOutcome.Pending },
      order: { offeredAt: 'DESC' },
    });
    if (!pending) return;
    pending.outcome = outcome;
    pending.outcomeAt = new Date();
    pending.assigned = assigned;
    await this.logs.save(pending);
  }

  async supersedePending(orderId: string, exceptDriverId?: string): Promise<void> {
    const pending = await this.logs.find({
      where: { orderId, outcome: OfferOutcome.Pending },
    });
    for (const row of pending) {
      if (exceptDriverId && row.driverId === exceptDriverId) continue;
      row.outcome = OfferOutcome.Superseded;
      row.outcomeAt = new Date();
      await this.logs.save(row);
    }
  }

  listByOrder(orderId: string): Promise<OrderOfferLog[]> {
    return this.logs.find({ where: { orderId }, order: { offeredAt: 'ASC' } });
  }
}
