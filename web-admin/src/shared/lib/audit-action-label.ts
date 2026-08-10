const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

const AUDIT_ACTION_LABELS: Record<string, string> = {
  'PATCH /admin/orders/:id/status': 'Изменение статуса заказа',
  'POST /admin/orders/:id/assign': 'Назначение водителя на заказ',
  'POST /admin/orders/:id/refund': 'Возврат по заказу',
  'PATCH /admin/staff/:id/status': 'Изменение статуса сотрудника',
  'PATCH /admin/staff/:id/revoke': 'Отзыв прав администратора',
  'DELETE /admin/staff/:id': 'Удаление администратора',
  'POST /admin/staff/assign': 'Назначение роли сотруднику',
  'PATCH /admin/drivers/:id/block': 'Блокировка водителя',
  'PATCH /admin/drivers/:id': 'Изменение данных водителя',
  'POST /admin/drivers/:id/approve': 'Одобрение водителя',
  'DELETE /admin/drivers/:id': 'Удаление водителя',
  'PATCH /admin/drivers/:id/documents/:id': 'Изменение документа водителя',
  'POST /admin/regions': 'Создание региона',
  'PATCH /admin/regions/:id': 'Изменение региона',
  'POST /admin/regions/:id/cities': 'Создание города',
  'PATCH /admin/regions/:id/cities/:id': 'Изменение города',
  'POST /admin/providers': 'Создание провайдера',
  'PATCH /admin/providers/:id': 'Изменение провайдера',
  'POST /admin/tariffs': 'Создание тарифа',
  'PATCH /admin/tariffs/:id': 'Изменение тарифа',
};

const METHOD_VERBS: Record<string, string> = {
  POST: 'Создание',
  PATCH: 'Изменение',
  PUT: 'Изменение',
  DELETE: 'Удаление',
};

const RESOURCE_LABELS: Record<string, string> = {
  orders: 'заказа',
  staff: 'сотрудника',
  drivers: 'водителя',
  regions: 'региона',
  cities: 'города',
  providers: 'провайдера',
  tariffs: 'тарифа',
  documents: 'документа',
};

function normalizeAuditAction(action: string): string {
  const match = action.match(/^(\w+)\s+(\S+)/);
  if (!match) return action;

  const [, method, rawPath] = match;
  const path = rawPath.replace(/^\/api\/v\d+/, '').replace(UUID_PATTERN, ':id');
  return `${method} ${path}`;
}

function fallbackAuditActionLabel(action: string): string {
  const normalized = normalizeAuditAction(action);
  const match = normalized.match(/^(\w+)\s+(.+)$/);
  if (!match) return action;

  const [, method, path] = match;
  const segments = path.split('/').filter(Boolean);
  const adminIndex = segments.indexOf('admin');
  const resourceKey = adminIndex >= 0 ? segments[adminIndex + 1] : segments[0];
  const resource = resourceKey ? (RESOURCE_LABELS[resourceKey] ?? resourceKey) : 'ресурса';
  const verb = METHOD_VERBS[method] ?? method;

  return `${verb} ${resource}`;
}

export function getAuditActionLabel(action: string): string {
  const normalized = normalizeAuditAction(action);
  return AUDIT_ACTION_LABELS[normalized] ?? fallbackAuditActionLabel(action);
}
