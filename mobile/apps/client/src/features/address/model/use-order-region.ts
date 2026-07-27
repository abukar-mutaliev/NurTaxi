/**
 * Регион заказа (M3.4): подтягивает справочник и выбирает пилотный регион по умолчанию.
 */
import { useEffect } from 'react';

import { useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { regionSelected, selectOrderDraft } from '@/processes/order-flow';

/** UUID региона из seed/migrations — Республика Ингушетия (пилот MVP). */
export const DEFAULT_REGION_ID = '00000000-0000-4000-8000-000000000001';

export function useOrderRegion(): {
  regionId: string | null;
  isLoading: boolean;
} {
  const dispatch = useAppDispatch();
  const { regionId } = useAppSelector(selectOrderDraft);
  const { data: regions, isLoading } = useGetRegionsQuery();

  useEffect(() => {
    if (regionId || !regions?.length) {
      return;
    }
    const preferred = regions.find((region) => region.id === DEFAULT_REGION_ID) ?? regions[0];
    if (preferred) {
      dispatch(regionSelected(preferred.id));
    }
  }, [dispatch, regionId, regions]);

  return { regionId, isLoading };
}
