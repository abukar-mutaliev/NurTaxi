export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorLabel: string | null;
  regionId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogListPage {
  items: AuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
}
