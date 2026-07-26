/**
 * Выплаты водителю — `/driver/payouts` (M9.2, `§22`).
 * Ключ идемпотентности сервер ждёт в теле запроса, поэтому подставляем его здесь.
 */
import { baseApi, withIdempotencyKey } from '@nurtaxi/shared-core/shared/api';
import type { LimitQuery, Payout } from '@nurtaxi/shared-core/shared/model';

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestPayout: build.mutation<Payout, { amount: number; idempotencyKey?: string }>({
      query: (payload) => ({
        url: '/driver/payouts',
        method: 'POST',
        body: withIdempotencyKey(payload),
      }),
      invalidatesTags: ['Payout', 'DriverEarnings', 'DriverProfile'],
    }),

    getPayouts: build.query<Payout[], LimitQuery | void>({
      query: (params) => ({ url: '/driver/payouts', params: params ?? undefined }),
      providesTags: ['Payout'],
    }),
  }),
});

export const { useRequestPayoutMutation, useGetPayoutsQuery } = paymentApi;
