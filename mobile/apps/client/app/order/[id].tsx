import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/shared/ui';

/**
 * Экран поездки: отражает все стадии конечного автомата заказа.
 * Данные заказа уже доступны через `useGetOrderQuery(id)`, обновления статуса и позиции
 * водителя — через `useOrderRealtime(id)` из `@nurtaxi/shared-core/features/realtime`.
 */
export default function OrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      description={`Заказ ${id}. Поиск водителя, карточка водителя и авто, стадии поездки, отмена с учётом политики тарифа, кнопка SOS, чек и отзыв после завершения.`}
      endpoints={[
        'GET /orders/{id}',
        'POST /orders/{id}/cancel',
        'POST /orders/{id}/sos',
        'POST /orders/{id}/review',
        'GET /orders/{id}/receipt',
        'WS order.status, driver.location',
      ]}
      task="M4.5 – M4.10, M5.2 – M5.3, M6.2 – M6.6"
      title="Поездка"
    />
  );
}
