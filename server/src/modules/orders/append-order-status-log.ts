import { Repository } from 'typeorm';
import { computeJournalChecksum } from '../../common/compliance/journal-checksum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { OrderStatusLog } from './entities/order-status-log.entity';

export async function appendOrderStatusLog(
  logs: Repository<OrderStatusLog>,
  entry: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actorId?: string | null;
    reason?: string | null;
  },
): Promise<OrderStatusLog> {
  const prev = await logs.findOne({
    where: { orderId: entry.orderId },
    order: { createdAt: 'DESC' },
  });
  const prevChecksum = prev?.recordChecksum ?? null;
  const recordChecksum = computeJournalChecksum({
    orderId: entry.orderId,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    actorId: entry.actorId ?? null,
    reason: entry.reason ?? null,
    prevChecksum,
  });
  return logs.save(
    logs.create({
      orderId: entry.orderId,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      actorId: entry.actorId ?? null,
      reason: entry.reason ?? null,
      prevChecksum,
      recordChecksum,
    }),
  );
}
