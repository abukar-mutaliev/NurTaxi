import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '@/app/store/hooks';
import { isAdminRole } from '@/shared/rbac';
import { PageLoader } from '@/shared/ui';

export function ProtectedRoute() {
  const isBootstrapped = useAppSelector((s) => s.session.isBootstrapped);
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);
  const user = useAppSelector((s) => s.session.user);

  if (!isBootstrapped) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user || !isAdminRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
