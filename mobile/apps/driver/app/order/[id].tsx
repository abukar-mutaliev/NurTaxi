import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/shared/ui';

/** Выполнение заказа водителем: подача, поездка, завершение. */
export default function DriverOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      description={`Заказ ${id}. Приём заказа, комментарий клиента, маршрут к точке подачи, смена статусов по конечному автомату (en_route → arrived → start → complete), отмена и оценка клиента.`}
      endpoints={[
        'POST /driver/orders/{id}/accept',
        'POST /driver/orders/{id}/status',
        'POST /driver/orders/{id}/cancel',
        'POST /driver/orders/{id}/review',
      ]}
      task="M8.4 – M8.8"
      title="Заказ"
    />
  );
}
