import {
  DashboardOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CarOutlined,
  ShoppingOutlined,
  DollarOutlined,
  ApiOutlined,
  UserSwitchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageOutlined,
  AuditOutlined,
  BankOutlined,
  CloudServerOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Select, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { clearSession } from '@/features/auth';
import { useListRegionsQuery } from '@/entities/region';
import { useLogoutMutation } from '@/entities/user';
import { setSelectedRegionId } from '@/features/auth';
import { useCanSelectRegion } from '@/features/region-context';
import { tokenStorage } from '@/shared/lib/token-storage';
import { can, roleLabel, type Permission } from '@/shared/rbac';
import { formatPhone } from '@/shared/lib/utils';
import { palette } from '@/shared/config/theme';
import { ConnectionStatus, RealtimeProvider } from '@/features/realtime';
import styles from './app-layout.module.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface NavItem {
  key: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  permission: Permission;
}

export function AppLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.session.user);
  const selectedRegionId = useAppSelector((s) => s.session.selectedRegionId);
  const canSelectRegion = useCanSelectRegion();
  const [collapsed, setCollapsed] = useState(false);
  const [logout] = useLogoutMutation();
  const { data: regions = [] } = useListRegionsQuery(undefined, { skip: !canSelectRegion });

  const navItems: NavItem[] = useMemo(
    () => [
      {
        key: 'dashboard',
        path: '/',
        label: t('nav.dashboard'),
        icon: <DashboardOutlined />,
        permission: 'dashboard.view',
      },
      {
        key: 'regions',
        path: '/regions',
        label: t('nav.regions'),
        icon: <EnvironmentOutlined />,
        permission: 'regions.manage',
      },
      {
        key: 'tariffs',
        path: '/tariffs',
        label: t('nav.tariffs'),
        icon: <DollarOutlined />,
        permission: 'tariffs.manage',
      },
      {
        key: 'providers',
        path: '/providers',
        label: t('nav.providers'),
        icon: <ApiOutlined />,
        permission: 'providers.manage',
      },
      {
        key: 'staff',
        path: '/staff',
        label: t('nav.staff'),
        icon: <UserSwitchOutlined />,
        permission: 'staff.manage',
      },
      {
        key: 'drivers',
        path: '/drivers',
        label: t('nav.drivers'),
        icon: <TeamOutlined />,
        permission: 'drivers.moderate',
      },
      {
        key: 'orders',
        path: '/orders',
        label: t('nav.orders'),
        icon: <ShoppingOutlined />,
        permission: 'orders.manage',
      },
      {
        key: 'carriers',
        path: '/carriers',
        label: t('nav.carriers'),
        icon: <BankOutlined />,
        permission: 'carriers.manage',
      },
      {
        key: 'placement',
        path: '/placement',
        label: t('nav.placement'),
        icon: <CloudServerOutlined />,
        permission: 'sites.manage',
      },
      {
        key: 'exports',
        path: '/exports',
        label: t('nav.exports'),
        icon: <ExportOutlined />,
        permission: 'orders.export',
      },
      {
        key: 'appeals',
        path: '/appeals',
        label: t('nav.appeals'),
        icon: <MessageOutlined />,
        permission: 'appeals.manage',
      },
      {
        key: 'audit',
        path: '/audit',
        label: t('nav.audit'),
        icon: <AuditOutlined />,
        permission: 'audit.view',
      },
    ],
    [t],
  );

  const visibleNav = navItems.filter((item) => user && can(user.role, item.permission));

  const selectedKey =
    visibleNav.find((item) => location.pathname.startsWith(item.path) && item.path !== '/')
      ?.key ??
    (location.pathname === '/' ? 'dashboard' : visibleNav[0]?.key);

  const menuItems: MenuProps['items'] = visibleNav.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    onClick: () => navigate(item.path),
  }));

  const handleLogout = async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await logout({ refreshToken }).unwrap();
      } catch {
        /* ignore */
      }
    }
    tokenStorage.clear();
    dispatch(clearSession());
    navigate('/login', { replace: true });
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <Layout className={styles.root}>
      <RealtimeProvider />
      <a href="#main-content" className={styles.skipLink}>
        Перейти к содержимому
      </a>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        className={styles.sider}
        trigger={null}
      >
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <CarOutlined />
          </div>
          {!collapsed && (
            <div>
              <Text className={styles.brandTitle}>Nur Taxi</Text>
              <Text className={styles.brandSubtitle}>{t('app.adminPanel')}</Text>
            </div>
          )}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={menuItems}
          className={styles.menu}
        />
      </Sider>
      <Layout>
        <Header className={styles.header}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed((v) => !v)}
            className={styles.menuToggle}
            aria-label={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
          />
          <Space size="middle" wrap>
            <ConnectionStatus />
            {canSelectRegion && (
              <Select
                allowClear
                placeholder={t('common.allRegions')}
                style={{ minWidth: 220 }}
                value={selectedRegionId ?? undefined}
                onChange={(value) => dispatch(setSelectedRegionId(value ?? null))}
                options={regions.map((r) => ({ value: r.id, label: r.name }))}
              />
            )}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space className={styles.userChip}>
                <Avatar style={{ backgroundColor: palette.gold }}>
                  {(user?.name ?? user?.phone ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <div className={styles.userMeta}>
                  <Text strong>{user?.name ?? formatPhone(user?.phone ?? '')}</Text>
                  <Text type="secondary" className={styles.userRole}>
                    {user ? roleLabel(user.role) : ''}
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className={styles.content} id="main-content" tabIndex={-1}>
          <div className={styles.contentInner}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
