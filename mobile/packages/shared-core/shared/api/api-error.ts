/**
 * Единый формат ошибок API на клиенте (M0.9).
 *
 * Сервер всегда отвечает `{ error: { code, message, details }, timestamp, path }`
 * (`server/src/common/filters/all-exceptions.filter.ts`). Любая сетевая, серверная или
 * неизвестная ошибка приводится здесь к одному типу `AppError`, чтобы UI не разбирал
 * `FetchBaseQueryError` вручную.
 */
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

import type { ApiErrorBody } from '../model/api-types';

export const ErrorCode = {
  Network: 'NETWORK_ERROR',
  Timeout: 'TIMEOUT',
  Unauthorized: 'UNAUTHORIZED',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  TooManyRequests: 'TOO_MANY_REQUESTS',
  Validation: 'VALIDATION_ERROR',
  Server: 'INTERNAL_ERROR',
  Unknown: 'UNKNOWN_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface AppError {
  /** Машинно-читаемый код: серверный (`OTP_INVALID`, `ORDER_CONFLICT`) либо клиентский. */
  code: string;
  /** Текст для пользователя. Ключ i18n подбирается по `code`, это fallback. */
  message: string;
  status?: number;
  details?: unknown;
  /** Сетевые сбои и 5xx безопасно повторять; 4xx — нет. */
  retryable: boolean;
}

type UnknownError = FetchBaseQueryError | SerializedError | undefined | null;

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const { error } = value as { error: unknown };
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

function codeByStatus(status: number): string {
  switch (status) {
    case 400:
      return ErrorCode.Validation;
    case 401:
      return ErrorCode.Unauthorized;
    case 403:
      return ErrorCode.Forbidden;
    case 404:
      return ErrorCode.NotFound;
    case 429:
      return ErrorCode.TooManyRequests;
    default:
      return status >= 500 ? ErrorCode.Server : ErrorCode.Unknown;
  }
}

export function toAppError(error: UnknownError): AppError {
  if (!error) {
    return { code: ErrorCode.Unknown, message: 'Неизвестная ошибка', retryable: false };
  }

  if ('status' in error) {
    if (error.status === 'FETCH_ERROR') {
      return {
        code: ErrorCode.Network,
        message: 'Нет соединения с сервером',
        details: error.error,
        retryable: true,
      };
    }
    if (error.status === 'TIMEOUT_ERROR') {
      return {
        code: ErrorCode.Timeout,
        message: 'Сервер не отвечает',
        details: error.error,
        retryable: true,
      };
    }
    if (error.status === 'PARSING_ERROR' || error.status === 'CUSTOM_ERROR') {
      return {
        code: ErrorCode.Unknown,
        message: 'Некорректный ответ сервера',
        details: error,
        retryable: false,
      };
    }

    const status = error.status;
    if (isApiErrorBody(error.data)) {
      return {
        code: error.data.error.code,
        message: error.data.error.message,
        status,
        details: error.data.error.details,
        retryable: status >= 500,
      };
    }
    return {
      code: codeByStatus(status),
      message: 'Ошибка запроса',
      status,
      details: error.data,
      retryable: status >= 500,
    };
  }

  return {
    code: error.code ?? ErrorCode.Unknown,
    message: error.message ?? 'Неизвестная ошибка',
    retryable: false,
  };
}

export function isUnauthorized(error: UnknownError): boolean {
  return Boolean(error && 'status' in error && error.status === 401);
}
