import { Badge, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/app/store/hooks';
import type { RealtimeStatus } from '../model/realtime-events';

const statusColor: Record<RealtimeStatus, 'success' | 'processing' | 'default' | 'error' | 'warning'> = {
  idle: 'default',
  connecting: 'processing',
  connected: 'success',
  reconnecting: 'warning',
  error: 'error',
};

export function ConnectionStatus() {
  const { t } = useTranslation();
  const status = useAppSelector((s) => s.realtime.status);

  return (
    <Tooltip title={t(`realtime.status.${status}`)}>
      <Badge status={statusColor[status]} text={t('realtime.live')} />
    </Tooltip>
  );
}
