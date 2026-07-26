import { PlaceholderScreen } from '@/shared/ui';

/** Подтверждение кода из SMS. Готовые помощники: компонент OtpInput, хуки useCountdown, useAuth. */
export default function CodeRoute() {
  return (
    <PlaceholderScreen
      description="Ввод кода из SMS, таймер повторной отправки по resendAfterSec, обработка неверного кода. Сохранение токенов и обновление сессии делает useAuth().verifyOtp."
      endpoints={['POST /auth/otp/verify']}
      task="M1.3"
      title="Код из SMS"
    />
  );
}
