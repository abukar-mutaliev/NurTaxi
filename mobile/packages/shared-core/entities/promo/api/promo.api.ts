/**
 * Промокоды и бонусный баланс — `/me/promo` (M6.7, `§8.3`).
 * Показывать раздел только при включённом feature-флаге региона (`design.md §4.2`).
 */
import { baseApi } from '@nurtaxi/shared-core/shared/api';
import type {
  PromoBalance,
  RedeemPromoPayload,
  RedeemPromoResponse,
} from '@nurtaxi/shared-core/shared/model';

export const PROMO_FEATURE_FLAG = 'promo';

export const promoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPromoBalance: build.query<PromoBalance, void>({
      query: () => '/me/promo/balance',
      providesTags: ['PromoBalance'],
    }),

    redeemPromo: build.mutation<RedeemPromoResponse, RedeemPromoPayload>({
      query: (body) => ({ url: '/me/promo/redeem', method: 'POST', body }),
      invalidatesTags: ['PromoBalance'],
    }),
  }),
});

export const { useGetPromoBalanceQuery, useRedeemPromoMutation } = promoApi;
