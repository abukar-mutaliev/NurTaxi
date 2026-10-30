/**
 * Входящий заказ поверх любого экрана (M8.3).
 *
 * Раньше подписка на предложения и карточка жили в экране смены. Вкладки при переходе
 * не размонтируются, но карточка оставалась внутри скрытой вкладки, а экраны поверх стека
 * (настройки, документы) закрывали её целиком: водитель, открывший профиль или историю,
 * не видел заказ, и тот уходил следующему. Поэтому предложение слушается на уровне
 * корневого навигатора и показывается модальным окном над всем приложением.
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { DriverOnlineStatus } from '@nurtaxi/shared-core/shared/model';
import { brandColors, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { selectSessionStatus } from '@nurtaxi/shared-core/entities/session';
import {
  useAcceptDriverOrderMutation,
  useGetDriverProfileQuery,
} from '@nurtaxi/shared-core/entities/driver';

import { useAppSelector } from '@/app/store/hooks';
import { IncomingOrderCard, useOrderOffer } from '@/features/order-offer';

/**
 * Предложения получает только водитель на линии: офлайн они не нужны, а занятому поездкой
 * (`busy`) сервер их не шлёт. Пока водитель вне линии, подписка не держится вовсе.
 */
export function IncomingOrderOverlay() {
  const isAuthenticated = useAppSelector(selectSessionStatus) === 'authenticated';
  const { data: profile } = useGetDriverProfileQuery(undefined, { skip: !isAuthenticated });

  if (!isAuthenticated || profile?.onlineStatus !== DriverOnlineStatus.Online) {
    return null;
  }

  return <OfferModal />;
}

function OfferModal() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { offer, secondsLeft, dismiss } = useOrderOffer();
  const [acceptOrder, { isLoading: accepting }] = useAcceptDriverOrderMutation();
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!offer) {
      return;
    }
    setError(null);
    try {
      await acceptOrder(offer.orderId).unwrap();
      dismiss();
      router.push(`/order/${offer.orderId}`);
    } catch (cause) {
      setError(toAppError(cause as never).message);
    }
  };

  const handleDecline = () => {
    setError(null);
    dismiss();
  };

  return (
    <Modal
      animationType="fade"
      // Системная «Назад» не отклоняет заказ: случайное нажатие стоило бы водителю поездки.
      // Ответить можно только кнопками карточки, а без ответа предложение истечёт само.
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible={offer !== null}
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingBottom: insets.bottom + theme.spacing.md,
            paddingHorizontal: theme.spacing.md,
          },
        ]}
      >
        {offer ? (
          <IncomingOrderCard
            accepting={accepting}
            error={error}
            offer={offer}
            onAccept={() => {
              void handleAccept();
            }}
            onDecline={handleDecline}
            secondsLeft={secondsLeft}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: brandColors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
});
