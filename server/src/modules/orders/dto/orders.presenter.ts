import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PriceBreakdown } from '../../tariffs/pricing.service';
import type { RouteResult } from '../../geo/map/map-provider.interface';
import type { Tariff } from '../../tariffs/entities/tariff.entity';
import type { Order } from '../entities/order.entity';
import type { OrderStatusLog } from '../entities/order-status-log.entity';
import { OrderStatus, PaymentMethod } from '../../../common/enums/order-status.enum';
import { VehicleResponse } from '../../drivers/dto/driver.presenter';

export class RouteResponse {
  @ApiProperty()
  polyline!: string;

  @ApiProperty()
  distanceM!: number;

  @ApiProperty()
  durationS!: number;

  static from(
    route: RouteResult | { polyline: string; distanceM: number; durationS: number },
  ): RouteResponse {
    return {
      polyline: route.polyline,
      distanceM: route.distanceM,
      durationS: route.durationS,
    };
  }
}

export class PriceBreakdownResponse {
  @ApiProperty()
  baseFare!: number;

  @ApiProperty()
  distancePart!: number;

  @ApiProperty()
  timePart!: number;

  @ApiProperty()
  minPriceApplied!: boolean;

  @ApiProperty()
  surgeMultiplier!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  estimated!: number;

  @ApiProperty()
  currency!: string;

  static from(breakdown: PriceBreakdown): PriceBreakdownResponse {
    return { ...breakdown };
  }
}

export class TariffSummaryResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  static from(tariff: Tariff): TariffSummaryResponse {
    return { id: tariff.id, name: tariff.name };
  }
}

export class OrderEstimateResponse {
  @ApiProperty({ type: RouteResponse })
  route!: RouteResponse;

  @ApiProperty({ type: PriceBreakdownResponse })
  price!: PriceBreakdownResponse;

  @ApiProperty({ type: TariffSummaryResponse })
  tariff!: TariffSummaryResponse;

  @ApiProperty()
  pickupEtaS!: number;
}

export class AssignedDriverResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  rating!: number;

  @ApiPropertyOptional()
  phone!: string | null;

  @ApiPropertyOptional({ type: VehicleResponse })
  vehicle!: VehicleResponse | null;
}

export class OrderResponse {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  regionId!: string;

  @ApiProperty()
  pickupAddress!: string;

  @ApiProperty()
  pickupLat!: number;

  @ApiProperty()
  pickupLng!: number;

  @ApiProperty()
  dropoffAddress!: string;

  @ApiProperty()
  dropoffLat!: number;

  @ApiProperty()
  dropoffLng!: number;

  @ApiProperty()
  priceEstimated!: number;

  @ApiPropertyOptional()
  priceFinal!: number | null;

  @ApiPropertyOptional()
  cancellationFee!: number | null;

  @ApiProperty({ enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional()
  comment!: string | null;

  @ApiPropertyOptional()
  familyMemberId!: string | null;

  @ApiPropertyOptional({ type: RouteResponse })
  route!: RouteResponse | null;

  @ApiPropertyOptional({ type: TariffSummaryResponse })
  tariff!: TariffSummaryResponse | null;

  @ApiPropertyOptional({ type: AssignedDriverResponse })
  driver!: AssignedDriverResponse | null;

  @ApiProperty()
  createdAt!: string;

  static from(order: Order): OrderResponse {
    const primaryVehicle =
      order.driver?.vehicles?.find((v) => v.isPrimary) ?? order.driver?.vehicles?.[0];

    return {
      id: order.id,
      status: order.status,
      regionId: order.regionId,
      pickupAddress: order.pickupAddress,
      pickupLat: order.pickupLat,
      pickupLng: order.pickupLng,
      dropoffAddress: order.dropoffAddress,
      dropoffLat: order.dropoffLat,
      dropoffLng: order.dropoffLng,
      priceEstimated: Number(order.priceEstimated),
      priceFinal: order.priceFinal ? Number(order.priceFinal) : null,
      cancellationFee: order.cancellationFee ? Number(order.cancellationFee) : null,
      paymentMethod: order.paymentMethod,
      comment: order.comment,
      familyMemberId: order.familyMemberId,
      route: order.route ? RouteResponse.from(order.route) : null,
      tariff: order.tariff ? TariffSummaryResponse.from(order.tariff) : null,
      driver: order.driver
        ? {
            id: order.driver.id,
            fullName: order.driver.fullName,
            rating: Number(order.driver.rating),
            phone: order.driver.user?.phone ?? null,
            vehicle: primaryVehicle ? VehicleResponse.from(primaryVehicle) : null,
          }
        : null,
      createdAt: order.createdAt.toISOString(),
    };
  }
}

export class OrderStatusLogResponse {
  @ApiProperty()
  fromStatus!: string | null;

  @ApiProperty()
  toStatus!: string;

  @ApiPropertyOptional()
  reason!: string | null;

  @ApiPropertyOptional()
  actorId!: string | null;

  @ApiPropertyOptional()
  actorLabel!: string | null;

  @ApiProperty()
  createdAt!: string;

  static from(log: OrderStatusLog, actorLabel?: string): OrderStatusLogResponse {
    return {
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      reason: log.reason,
      actorId: log.actorId,
      actorLabel: actorLabel ?? null,
      createdAt: log.createdAt.toISOString(),
    };
  }
}

export class NearbyDriverResponse {
  @ApiProperty()
  driverId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiPropertyOptional()
  phone!: string | null;

  @ApiProperty()
  rating!: number;

  @ApiProperty()
  lat!: number;

  @ApiProperty()
  lng!: number;

  @ApiProperty()
  distanceM!: number;

  @ApiPropertyOptional()
  vehicle!: { make: string; model: string; plateNumber: string } | null;

  static from(candidate: {
    driverId: string;
    fullName: string;
    phone: string | null;
    rating: number;
    lat: number;
    lng: number;
    distanceM: number;
    vehicle: { make: string; model: string; plateNumber: string } | null;
  }): NearbyDriverResponse {
    return { ...candidate };
  }
}

export class OrderListPageResponse {
  @ApiProperty({ type: [OrderResponse] })
  items!: OrderResponse[];

  @ApiPropertyOptional()
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;

  static from(page: {
    items: Order[];
    nextCursor: string | null;
    hasMore: boolean;
  }): OrderListPageResponse {
    return {
      items: page.items.map(OrderResponse.from),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    };
  }
}

export class OrderHistoryResponse {
  @ApiProperty({ type: OrderResponse })
  order!: OrderResponse;

  @ApiPropertyOptional()
  receiptNumber!: string | null;

  @ApiPropertyOptional()
  receiptAmount!: number | null;

  @ApiProperty({ type: [Object] })
  reviews!: Array<{ id: string; rating: number; target: string; text: string | null }>;

  static from(params: {
    order: Order;
    receipt?: { receiptNumber: string; amount: string } | null;
    reviews: Array<{ id: string; rating: number; target: string; text: string | null }>;
  }): OrderHistoryResponse {
    return {
      order: OrderResponse.from(params.order),
      receiptNumber: params.receipt?.receiptNumber ?? null,
      receiptAmount: params.receipt ? Number(params.receipt.amount) : null,
      reviews: params.reviews,
    };
  }
}
