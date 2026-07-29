/**
 * Заказы клиента — `/orders/*` (M4, M5.3, M6, `§8.10–8.14`).
 *
 * `getOrder` — единственный источник истины о заказе; WebSocket-слой обновляет его кэш через
 * `updateQueryData`, поэтому поллинг после подключения WS не нужен (`M4.10`, `M5.2`).
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  CancelOrderPayload,
  CreateOrderPayload,
  CreateReviewPayload,
  GeoLocation,
  LimitQuery,
  Order,
  OrderEstimate,
  OrderEstimatePayload,
  OrderHistoryItem,
  Receipt,
  Review,
  SosResponse,
} from '@nurtaxi/shared-core/shared/model';
import { toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';

function sanitizeOrderEstimatePayload(body: OrderEstimatePayload): OrderEstimatePayload {
  return {
    ...body,
    pickup: toApiGeoLocation(body.pickup),
    dropoff: toApiGeoLocation(body.dropoff),
  };
}

function sanitizeCreateOrderPayload(body: CreateOrderPayload): CreateOrderPayload {
  return {
    ...sanitizeOrderEstimatePayload(body),
    paymentMethod: body.paymentMethod,
    comment: body.comment,
    familyMemberId: body.familyMemberId,
  };
}

export const orderApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Цена и маршрут до создания заказа (`§8.10`). */
    estimateOrder: build.mutation<OrderEstimate, OrderEstimatePayload>({
      query: (body) => ({
        url: '/orders/estimate',
        method: 'POST',
        body: sanitizeOrderEstimatePayload(body),
      }),
    }),

    createOrder: build.mutation<Order, CreateOrderPayload>({
      query: (body) => ({
        url: '/orders',
        method: 'POST',
        body: sanitizeCreateOrderPayload(body),
      }),
      invalidatesTags: ['Order', 'OrderHistory'],
    }),

    getOrder: build.query<Order, string>({
      query: (orderId) => `/orders/${orderId}`,
      providesTags: (_result, _error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    getOrderHistory: build.query<OrderHistoryItem[], LimitQuery | void>({
      query: (params) => ({ url: '/orders/history', params: params ?? undefined }),
      providesTags: ['OrderHistory'],
    }),

    cancelOrder: build.mutation<Order, { orderId: string } & CancelOrderPayload>({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: 'Order', id: orderId },
        'OrderHistory',
      ],
    }),

    /** SOS во время поездки (`§8.7`): сервер рассылает данные экстренным контактам. */
    activateSos: build.mutation<SosResponse, { orderId: string } & GeoLocation>({
      query: ({ orderId, ...body }) => ({ url: `/orders/${orderId}/sos`, method: 'POST', body }),
    }),

    reviewOrder: build.mutation<Review, { orderId: string } & CreateReviewPayload>({
      query: ({ orderId, ...body }) => ({
        url: `/orders/${orderId}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OrderHistory', 'Review'],
    }),

    getReceipt: build.query<Receipt, string>({
      query: (orderId) => `/orders/${orderId}/receipt`,
      providesTags: (_result, _error, orderId) => [{ type: 'Receipt', id: orderId }],
    }),
  }),
});

export const {
  useEstimateOrderMutation,
  useCreateOrderMutation,
  useGetOrderQuery,
  useLazyGetOrderQuery,
  useGetOrderHistoryQuery,
  useCancelOrderMutation,
  useActivateSosMutation,
  useReviewOrderMutation,
  useGetReceiptQuery,
} = orderApi;
