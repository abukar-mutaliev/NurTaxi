import { PlaceholderScreen } from '@/shared/ui';

/**
 * Статус верификации — обязательный шлюз перед выходом на линию (`§8.2`, `§12.3`).
 * Guard не пускает водителя в основное приложение, пока `verificationStatus !== approved`.
 */
export default function VerificationStatusRoute() {
  return (
    <PlaceholderScreen
      description="Статусы draft / pending / in_review / approved / rejected, причина отклонения и повторная подача. Готовые помощники: missingDocumentTypes, canSubmitForReview, verificationTone."
      endpoints={['GET /driver/profile', 'POST /driver/documents/submit']}
      task="M7.3, M7.4"
      title="Статус верификации"
    />
  );
}
