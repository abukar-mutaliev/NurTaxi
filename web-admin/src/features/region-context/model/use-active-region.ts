import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { Role } from '@/shared/model/enums';
import { resolveScopedRegionId } from '@/shared/lib/region-guard';

export function useActiveRegionId(): string | undefined {
  const user = useAppSelector((s) => s.session.user);
  const selectedRegionId = useAppSelector((s) => s.session.selectedRegionId);

  return useMemo(() => {
    if (!user) return undefined;
    return resolveScopedRegionId(user.role, user.assignedRegionId, selectedRegionId ?? undefined);
  }, [user, selectedRegionId]);
}

export function useCanSelectRegion(): boolean {
  const role = useAppSelector((s) => s.session.user?.role);
  return role === Role.SuperAdmin;
}
