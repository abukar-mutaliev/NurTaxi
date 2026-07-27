/**
 * Глобальный индикатор офлайна / восстановления связи (M5.5).
 */
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import { OfflineBanner, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { selectIsAuthenticated } from '@nurtaxi/shared-core/entities/session';
import {
  selectRealtimeStatus,
  type WithRealtimeState,
} from '@nurtaxi/shared-core/features/realtime';

import { selectIsNetworkConnected, type WithNetworkState } from '../model/network.slice';

type BannerRootState = WithNetworkState & WithRealtimeState;

export function NetworkBanner() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isConnected = useSelector((state: BannerRootState) => selectIsNetworkConnected(state));
  const realtimeStatus = useSelector((state: BannerRootState) => selectRealtimeStatus(state));
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const isRealtimeDegraded =
    isAuthenticated &&
    isConnected &&
    (realtimeStatus === 'connecting' ||
      realtimeStatus === 'reconnecting' ||
      realtimeStatus === 'error');

  const visible = !isConnected || isRealtimeDegraded;
  const label = !isConnected ? t('common.offline') : t('common.reconnecting');

  if (!visible) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.warningSurface,
        paddingTop: insets.top,
      }}
    >
      <OfflineBanner label={label} visible />
    </View>
  );
}
