import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/shared/ui';

/** Совместное отслеживание поездки — открывается по ссылке из SOS или семейного доступа. */
export default function TrackRoute() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  return (
    <PlaceholderScreen
      description={`Отслеживание заказа ${orderId}: маршрут, координаты, данные водителя и авто, статус поездки для получателя ссылки.`}
      endpoints={['GET /orders/{id}', 'WS subscribe:order']}
      task="M5.4"
      title="Отслеживание поездки"
    />
  );
}
