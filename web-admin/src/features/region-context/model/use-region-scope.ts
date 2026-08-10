import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { useGetRegionQuery } from '@/entities/region';
import { Role } from '@/shared/model/enums';
import { useActiveRegionId, useCanSelectRegion } from '../model/use-active-region';

export function useRegionScope() {
  const user = useAppSelector((s) => s.session.user);
  const regionId = useActiveRegionId();
  const canSelectRegion = useCanSelectRegion();
  const isRegionLocked = user?.role === Role.RegionalAdmin || user?.role === Role.Operator;

  const { data: region } = useGetRegionQuery(regionId ?? '', {
    skip: !regionId,
  });

  const regionName = useMemo(() => {
    if (canSelectRegion && regionId && region) return region.name;
    if (isRegionLocked && region) return region.name;
    return undefined;
  }, [canSelectRegion, regionId, region, isRegionLocked]);

  const requiresRegionSelection = canSelectRegion && !regionId;

  return {
    regionId,
    regionName,
    isRegionLocked,
    canSelectRegion,
    requiresRegionSelection,
  };
}
