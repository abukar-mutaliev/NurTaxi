import { createHash } from 'node:crypto';

export interface JournalChecksumInput {
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  reason: string | null;
  prevChecksum: string | null;
}

export function computeJournalChecksum(input: JournalChecksumInput): string {
  const canonical = [
    input.orderId,
    input.fromStatus ?? '',
    input.toStatus,
    input.actorId ?? '',
    input.reason ?? '',
    input.prevChecksum ?? '',
  ].join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

export function verifyJournalChecksum(input: JournalChecksumInput, checksum: string): boolean {
  return computeJournalChecksum(input) === checksum;
}
