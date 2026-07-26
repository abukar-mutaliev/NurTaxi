import { PlaceholderScreen } from '@/shared/ui';

/** Рабочий экран смены: карта, переключатель линии, входящие заказы. */
export default function ShiftRoute() {
  return (
    <PlaceholderScreen
      description="Переключатель ONLINE/OFFLINE, карта, фоновая передача геопозиции, входящие предложения заказов со звуком и таймаутом. Состояние смены уже готово в src/processes/shift."
      endpoints={[
        'PATCH /driver/status',
        'PATCH /driver/location',
        'WS driver.location, order.status',
      ]}
      task="M8.1 – M8.3"
      title="Смена"
    />
  );
}
