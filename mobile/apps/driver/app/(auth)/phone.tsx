import { PlaceholderScreen } from '@/shared/ui';

/**
 * Вход по номеру телефона.
 * Логика уже готова: `useAuth()` из `@nurtaxi/shared-core/features/auth` умеет
 * `requestOtp`, `verifyOtp` и `logout` — экрану остаётся только форма.
 */
export default function PhoneRoute() {
  return (
    <PlaceholderScreen
      description="Ввод номера с маской и валидацией, запрос кода. Готовые помощники: applyPhoneMask, isValidPhone, useAuth().requestOtp."
      endpoints={['POST /auth/otp/request']}
      task="M1.2"
      title="Вход по номеру телефона"
    />
  );
}
