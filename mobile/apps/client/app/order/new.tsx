import { PlaceholderScreen } from '@/shared/ui';

/** Оформление заказа: расчёт цены, тариф, оплата, комментарий, подтверждение. */
export default function NewOrderRoute() {
  return (
    <PlaceholderScreen
      description="Карточка с ETA, дистанцией и ценой до заказа; выбор тарифа и способа оплаты; комментарий водителю; подтверждение и создание заказа."
      endpoints={['POST /orders/estimate', 'POST /orders']}
      task="M4.2 – M4.4"
      title="Оформление заказа"
    />
  );
}
