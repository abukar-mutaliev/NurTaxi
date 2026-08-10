import { useMemo } from 'react';
import { useAppSelector } from '@/app/store/hooks';
import { can, type Permission } from './permissions';

export function useCan(permission: Permission): boolean {
  const role = useAppSelector((s) => s.session.user?.role);
  return useMemo(() => (role ? can(role, permission) : false), [role, permission]);
}

export function useRole() {
  return useAppSelector((s) => s.session.user?.role);
}
