import { PlaceholderScreen } from '@/shared/ui';

/** Профиль водителя. */
export default function DriverProfileRoute() {
  return (
    <PlaceholderScreen
      description="Фото, рейтинг, число поездок, сведения об автомобиле, график работы, язык интерфейса, выход из аккаунта."
      endpoints={['GET /driver/profile', 'PATCH /driver/work-schedule', 'GET /me', 'PATCH /me']}
      task="M7.5"
      title="Профиль водителя"
    />
  );
}
