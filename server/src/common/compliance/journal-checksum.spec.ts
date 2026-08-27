import { computeJournalChecksum, verifyJournalChecksum } from './journal-checksum';

describe('journal checksum (FZ-03.6)', () => {
  it('is stable for the same record', () => {
    const input = {
      orderId: 'o1',
      fromStatus: null,
      toStatus: 'created',
      actorId: 'u1',
      reason: null,
      prevChecksum: null,
    };
    const a = computeJournalChecksum(input);
    const b = computeJournalChecksum(input);
    expect(a).toHaveLength(64);
    expect(a).toBe(b);
    expect(verifyJournalChecksum(input, a)).toBe(true);
  });

  it('chains from previous checksum', () => {
    const first = computeJournalChecksum({
      orderId: 'o1',
      fromStatus: null,
      toStatus: 'created',
      actorId: null,
      reason: null,
      prevChecksum: null,
    });
    const second = computeJournalChecksum({
      orderId: 'o1',
      fromStatus: 'created',
      toStatus: 'searching_driver',
      actorId: null,
      reason: null,
      prevChecksum: first,
    });
    expect(second).not.toBe(first);
    expect(
      verifyJournalChecksum(
        {
          orderId: 'o1',
          fromStatus: 'created',
          toStatus: 'searching_driver',
          actorId: null,
          reason: null,
          prevChecksum: 'tampered',
        },
        second,
      ),
    ).toBe(false);
  });
});
