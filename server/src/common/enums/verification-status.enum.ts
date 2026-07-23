/**
 * Статус верификации водителя (Req §8.2, §12.3, Des §13.1).
 * Без `approved` водитель не может выйти на линию.
 */
export enum VerificationStatus {
  Draft = 'draft',
  Pending = 'pending',
  InReview = 'in_review',
  Approved = 'approved',
  Rejected = 'rejected',
}
