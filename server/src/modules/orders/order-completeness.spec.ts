import { CompletenessStatus } from '../../common/enums/compliance.enum';
import { OrderStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import { historicallyUnavailableSnapshot } from '../../common/compliance/assignment-snapshot';
import { evaluateOrderCompleteness } from './order-completeness';
import type { Order } from './entities/order.entity';

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    publicNumber: 'NT-00100001',
    regionId: 'r1',
    paymentMethod: PaymentMethod.Cash,
    pickupAddress: 'A',
    dropoffAddress: 'B',
    status: OrderStatus.Closed,
    assignmentSnapshot: {
      capturedAt: new Date().toISOString(),
      driver: { id: 'd1', fullName: 'Иван', phone: '+7900' },
      vehicle: {
        id: 'v1',
        make: 'Kia',
        model: 'Rio',
        plateNumber: 'A111AA06',
        color: 'white',
        year: 2020,
        vin: null,
      },
      carrier: {
        id: 'c1',
        name: 'Park',
        inn: '1234567890',
        ogrn: '1234567890123',
        legalForm: 'ooo',
        address: 'addr',
      },
      permit: {
        id: 'p1',
        number: 'PERM-1',
        issuedBy: 'МИНТРАНС',
        issuedAt: '2026-01-01',
        expiresAt: '2027-01-01',
      },
      contacts: { driverPhone: '+7900', clientPhone: '+7911' },
    },
    tripStartedAt: new Date(),
    tripEndedAt: new Date(),
    ...overrides,
  } as Order;
}

describe('evaluateOrderCompleteness', () => {
  it('marks a fully filled closed order complete', () => {
    const result = evaluateOrderCompleteness(baseOrder());
    expect(result.status).toBe(CompletenessStatus.Complete);
    expect(result.missing).toEqual([]);
  });

  it('reports missing snapshot fields', () => {
    const result = evaluateOrderCompleteness(
      baseOrder({ assignmentSnapshot: null, tripStartedAt: null, tripEndedAt: null }),
    );
    expect(result.status).toBe(CompletenessStatus.Incomplete);
    expect(result.missing).toEqual(
      expect.arrayContaining(['assignmentSnapshot', 'tripStartedAt', 'tripEndedAt']),
    );
  });

  it('accepts historical unavailability', () => {
    const result = evaluateOrderCompleteness(
      baseOrder({ assignmentSnapshot: historicallyUnavailableSnapshot() }),
    );
    expect(result.status).toBe(CompletenessStatus.HistoricallyUnavailable);
  });
});
