export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface ChargeRequest {
  amount: number;
  currency: string;
  orderId: string;
  idempotencyKey: string;
  description?: string;
}

export interface ChargeResult {
  transactionId: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
}

export interface RefundRequest {
  transactionId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
}

export interface PayoutRequest {
  amount: number;
  currency: string;
  driverId: string;
  idempotencyKey: string;
}

export interface PayoutResult {
  payoutId: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
}

/**
 * Адаптер платёжного провайдера (Des §4.3, §8).
 * Конкретная реализация выбирается по ProviderConfig региона (Фаза 7).
 */
export interface PaymentProvider {
  charge(request: ChargeRequest): Promise<ChargeResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
  payout(request: PayoutRequest): Promise<PayoutResult>;
}
