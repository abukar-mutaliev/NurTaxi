/**
 * Главный экран клиента (M3.3): карта, «моё местоположение», вход в поиск адреса.
 *
 * Реализовано: разрешения геолокации, карта, центрирование, переход к активному заказу.
 * Дальнейшие шаги — в задачах M3.4–M3.7 и M4.
 */
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, Card, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';
import { orderStatusLabelKey, useGetOrderQuery } from '@nurtaxi/shared-core/entities/order';

import { useAppSelector } from '@/app/store/hooks';
import { selectActiveOrderId } from '@/processes/order-flow';
import { MapCanvas, type MapCanvasHandle } from '@/widgets/map';

export function HomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const mapRef = useRef<MapCanvasHandle>(null);

  const permission = useLocationPermission();
  const { position } = useCurrentPosition(permission.state === 'granted');

  const activeOrderId = useAppSelector(selectActiveOrderId);
  const { data: activeOrder } = useGetOrderQuery(activeOrderId ?? '', { skip: !activeOrderId });

  const centerOnMe = () => {
    if (position) {
      mapRef.current?.centerOn(position, 0.01);
    }
  };

  return (
    <View style={styles.root}>
      <MapCanvas
        initialPoint={position}
        ref={mapRef}
        showsUserLocation={permission.state === 'granted'}
      />

      <View style={[styles.overlay, { padding: theme.spacing.lg, gap: theme.spacing.md }]}>
        {permission.state === 'denied' ? (
          <Card tone="warning">
            <Text variant="label">{t('permissions.locationDenied')}</Text>
            <Text variant="caption">{t('permissions.locationDescription')}</Text>
            <Button
              onPress={permission.canAskAgain ? permission.request : permission.openSettings}
              size="md"
              title={permission.canAskAgain ? t('common.retry') : t('permissions.openSettings')}
              variant="secondary"
            />
          </Card>
        ) : null}

        {activeOrder ? (
          <Pressable onPress={() => router.push(`/order/${activeOrder.id}`)}>
            <Card>
              <Text variant="label">{t(orderStatusLabelKey(activeOrder.status))}</Text>
              <Text variant="caption">{activeOrder.dropoffAddress}</Text>
            </Card>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.bottom, { padding: theme.spacing.lg, gap: theme.spacing.sm }]}>
        {position ? (
          <Button
            fullWidth={false}
            onPress={centerOnMe}
            size="md"
            style={styles.locateButton}
            title={t('addresses.myLocation')}
            variant="secondary"
          />
        ) : null}

        <Card>
          {/* TODO(M3.4): поиск адреса с debounce и подсказками GET /geo/search. */}
          <Button onPress={() => router.push('/address/search')} title={t('order.where')} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  locateButton: {
    alignSelf: 'flex-end',
  },
  overlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  root: {
    flex: 1,
  },
});
