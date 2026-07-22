/**
 * Статус аккаунта пользователя (Req §12.3, §20).
 * Блокировка используется модерацией/безопасностью и не зависит от роли.
 */
export enum UserStatus {
  Active = 'active',
  Blocked = 'blocked',
  Deleted = 'deleted',
}
