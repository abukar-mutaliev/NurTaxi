export type MobileIdChallengeStatus = 'pending' | 'otp_required' | 'confirmed' | 'failed';

/**
 * Статусы SMS Aero Mobile ID:
 * 0 очередь, 8 в процессе, 3 нужен SMS-код, 1 успех, 2 отказ, 16 ошибка.
 */
export function mapMobileIdStatus(code: number): MobileIdChallengeStatus {
  switch (code) {
    case 1:
      return 'confirmed';
    case 2:
    case 16:
      return 'failed';
    case 3:
      return 'otp_required';
    default:
      return 'pending';
  }
}

const RANK: Record<MobileIdChallengeStatus, number> = {
  pending: 0,
  otp_required: 1,
  confirmed: 2,
  failed: 2,
};

/** Не даём более раннему вебхуку затереть уже известный итог. */
export function preferStatus(
  current: MobileIdChallengeStatus,
  next: MobileIdChallengeStatus,
): MobileIdChallengeStatus {
  if (current === 'confirmed' || current === 'failed') return current;
  if (RANK[next] < RANK[current]) return current;
  return next;
}
