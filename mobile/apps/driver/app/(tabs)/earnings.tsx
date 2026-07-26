import { PlaceholderScreen } from '@/shared/ui';

/** Доходы и выплаты водителя. */
export default function EarningsRoute() {
  return (
    <PlaceholderScreen
      description="Доход за день, неделю и месяц, детализация по поездкам, запрос вывода средств и история выплат. Ключ идемпотентности подставляется автоматически в useRequestPayoutMutation."
      endpoints={['GET /driver/earnings', 'POST /driver/payouts', 'GET /driver/payouts']}
      task="M9.1 – M9.3"
      title="Доходы"
    />
  );
}
