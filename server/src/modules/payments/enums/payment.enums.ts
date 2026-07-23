export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
}

export enum PayoutStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}

export enum LedgerAccountType {
  Platform = 'platform',
  Driver = 'driver',
}

export enum LedgerEntrySide {
  Debit = 'debit',
  Credit = 'credit',
}

export enum OutboxStatus {
  Pending = 'pending',
  Published = 'published',
  Failed = 'failed',
}
