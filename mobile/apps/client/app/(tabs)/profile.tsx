import { PlaceholderScreen } from '@/shared/ui';

/** Профиль и настройки клиента. */
export default function ProfileRoute() {
  return (
    <PlaceholderScreen
      description="Фото, имя, язык интерфейса, настройки уведомлений и приватности, разделы «Любимые адреса», «Экстренные контакты», «Семья», «Способы оплаты», выход из аккаунта."
      endpoints={['GET /me', 'PATCH /me', 'POST /auth/logout']}
      task="M2.1 – M2.6"
      title="Профиль"
    />
  );
}
