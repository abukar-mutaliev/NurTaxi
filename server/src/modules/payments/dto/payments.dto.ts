import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, MaxLength, Min } from 'class-validator';
import type { Receipt } from '../entities/receipt.entity';
import type { Payout } from '../entities/payout.entity';
import { PayoutStatus } from '../enums/payment.enums';

export class RequestPayoutDto {
  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: 'Ключ идемпотентности (UUID клиента)' })
  @IsString()
  @MaxLength(128)
  idempotencyKey!: string;
}

export class ReceiptResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  receiptNumber!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  issuedAt!: string;

  @ApiProperty()
  payload!: Record<string, unknown>;

  static from(receipt: Receipt): ReceiptResponse {
    return {
      id: receipt.id,
      orderId: receipt.orderId,
      receiptNumber: receipt.receiptNumber,
      amount: Number(receipt.amount),
      currency: receipt.currency,
      issuedAt: receipt.issuedAt.toISOString(),
      payload: receipt.payload as unknown as Record<string, unknown>,
    };
  }
}

export class PayoutResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: PayoutStatus })
  status!: PayoutStatus;

  @ApiProperty()
  requestedAt!: string;

  @ApiProperty({ nullable: true })
  processedAt!: string | null;

  static from(payout: Payout): PayoutResponse {
    return {
      id: payout.id,
      amount: Number(payout.amount),
      currency: payout.currency,
      status: payout.status,
      requestedAt: payout.requestedAt.toISOString(),
      processedAt: payout.processedAt?.toISOString() ?? null,
    };
  }
}
