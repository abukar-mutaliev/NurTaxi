import { PlaceholderScreen } from '@/shared/ui';

/** Анкета водителя и загрузка документов. */
export default function DriverRegistrationRoute() {
  return (
    <PlaceholderScreen
      description="ФИО, дата рождения, адрес, стаж, регион и данные автомобиля. Готовая схема валидации: driverRegistrationFormSchema. Документы загружаются в два шага: presign → прямая загрузка в S3 → регистрация storageKey."
      endpoints={[
        'GET /driver/regions',
        'POST /driver/register',
        'POST /driver/documents/presign',
        'POST /driver/documents',
      ]}
      task="M7.1, M7.2"
      title="Анкета водителя"
    />
  );
}
