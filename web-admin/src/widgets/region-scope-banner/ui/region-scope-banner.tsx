import { Alert, Tag } from 'antd';
import { EnvironmentOutlined, LockOutlined } from '@ant-design/icons';
import { useRegionScope } from '@/features/region-context';
import styles from './region-scope-banner.module.css';

interface RegionScopeBannerProps {
  requireRegion?: boolean;
}

export function RegionScopeBanner({ requireRegion = false }: RegionScopeBannerProps) {
  const { regionName, isRegionLocked, requiresRegionSelection } = useRegionScope();

  if (requiresRegionSelection && requireRegion) {
    return (
      <Alert
        type="warning"
        showIcon
        className={styles.banner}
        message="Выберите регион"
        description="Для работы с данным разделом выберите регион в шапке панели."
      />
    );
  }

  if (!regionName) return null;

  return (
    <div className={styles.banner}>
      <Tag icon={isRegionLocked ? <LockOutlined /> : <EnvironmentOutlined />} color="processing">
        {isRegionLocked ? `Регион: ${regionName}` : `Просмотр региона: ${regionName}`}
      </Tag>
      {isRegionLocked && (
        <span className={styles.hint}>Доступ ограничен назначенным регионом</span>
      )}
    </div>
  );
}
