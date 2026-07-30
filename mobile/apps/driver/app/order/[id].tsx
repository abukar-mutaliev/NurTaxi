import { useLocalSearchParams } from 'expo-router';

import { OrderScreen } from '@/screens/order';

/** Выполнение заказа водителем: подача, поездка, завершение (M8.4–M8.8). */
export default function DriverOrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <OrderScreen orderId={id} />;
}
