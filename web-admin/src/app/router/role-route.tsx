import type { Permission } from '@/shared/rbac';
import { can } from '@/shared/rbac';
import { useAppSelector } from '@/app/store/hooks';
import { Result, Button } from 'antd';

interface RoleRouteProps {
  permission: Permission;
  children: React.ReactNode;
}

export function RoleRoute({ permission, children }: RoleRouteProps) {
  const user = useAppSelector((s) => s.session.user);

  if (!user || !can(user.role, permission)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="У вас нет доступа к этому разделу."
        extra={
          <Button type="primary" href="/">
            На главную
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
