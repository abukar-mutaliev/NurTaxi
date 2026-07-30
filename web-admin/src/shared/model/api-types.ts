export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

export interface PaginatedMeta {
  cursor?: string;
  hasMore?: boolean;
}

export type { ApiErrorBody as ApiError };
