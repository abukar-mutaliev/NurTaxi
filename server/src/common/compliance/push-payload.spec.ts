import { sanitizePushData } from './push-payload';

describe('sanitizePushData (FZ-02.4)', () => {
  it('keeps only eventId', () => {
    expect(
      sanitizePushData({
        eventId: 'order.assigned',
        phone: '+79280000001',
        pickupAddress: 'Назрань',
        userId: 'uuid',
      }),
    ).toEqual({ eventId: 'order.assigned' });
  });

  it('falls back to eventType', () => {
    expect(sanitizePushData({ eventType: 'trip.completed' })).toEqual({
      eventId: 'trip.completed',
    });
  });
});
