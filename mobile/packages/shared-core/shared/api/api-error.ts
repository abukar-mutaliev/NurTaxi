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
  /** Ошибки по полям запроса — показывать рядом с соответствующим вводом. */
  fields?: Record<string, string>;
  /** Сетевые сбои и 5xx безопасно повторять; 4xx — нет. */
  retryable: boolean;
}

type UnknownError = FetchBaseQueryError | SerializedError | Error | undefined | null;

const VALIDATION_SUMMARY = 'Проверьте правильность заполнения полей.';

const FILE_FIELDS = new Set(['contentLength', 'contentType', 'fileName', 'storageKey', 'type']);

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

function looksTechnical(message: string): boolean {
  return (
    /CLEARTEXT|network security policy/i.test(message) ||
    /property \S+ should not exist/i.test(message) ||
    /\bmust be\b/i.test(message) ||
    /\bmust not\b/i.test(message) ||
    /\bshould not be empty\b/i.test(message)
  );
}

function fileFieldMessage(path: string, raw: string): string {
  const leaf = path.split('.').at(-1) ?? path;
  if (leaf === 'contentType' || /one of|enum/i.test(raw)) {
    return 'Этот формат файла не подходит. Выберите JPEG, PNG, WebP, HEIC или PDF.';
  }
  if (leaf === 'contentLength' && /greater than|too large|max/i.test(raw)) {
    return 'Файл слишком большой. Выберите фото меньшего размера.';
  }
  return 'Не удалось загрузить файл. Попробуйте ещё раз.';
}

function humanizeTechnicalMessage(message: string): string {
  if (/CLEARTEXT|network security policy/i.test(message)) {
    return 'Не удалось отправить файл. Проверьте подключение к сети и попробуйте ещё раз.';
  }

  const parts = message
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const fields = fieldsFromRawMessages(parts);
  const values = Object.values(fields);
  const only = values[0];
  if (values.length === 1 && only) {
    return only;
  }
  if (values.length > 1) {
    return VALIDATION_SUMMARY;
  }

  return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

function fieldsFromRawMessages(messages: string[]): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const message of messages) {
    const extra = message.match(/^property ([A-Za-z0-9_.]+) should not exist$/i);
    const extraPath = extra?.[1];
    if (extraPath) {
      const leaf = extraPath.split('.').at(-1) ?? extraPath;
      fields[extraPath] = FILE_FIELDS.has(leaf)
        ? 'Не удалось загрузить файл. Попробуйте ещё раз.'
        : 'Не удалось обработать данные. Попробуйте ещё раз.';
      continue;
    }

    const must = message.match(/^([A-Za-z0-9_.]+) must (.+)$/i);
    const path = must?.[1];
    const rest = must?.[2];
    if (path && rest) {
      const leaf = path.split('.').at(-1) ?? path;
      if (FILE_FIELDS.has(leaf)) {
        fields[path] = fileFieldMessage(path, message);
      } else if (/empty/i.test(rest)) {
        fields[path] = 'Заполните это поле.';
      } else if (/integer|number/i.test(rest)) {
        fields[path] = 'Укажите число.';
      } else {
        fields[path] = 'Проверьте это поле.';
      }
    }
  }

  return fields;
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    return typeof entry[1] === 'string' && entry[1].trim().length > 0;
  });
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export function fieldErrorsFromDetails(details: unknown): Record<string, string> | undefined {
  if (Array.isArray(details) && details.every((item) => typeof item === 'string')) {
    const fields = fieldsFromRawMessages(details);
    return Object.keys(fields).length > 0 ? fields : undefined;
  }

  if (typeof details !== 'object' || details === null) {
    return undefined;
  }

  const record = details as Record<string, unknown>;
  return asStringRecord(record.fields) ?? asStringRecord(details);
}

export function humanizeErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
  }
  return looksTechnical(trimmed) ? humanizeTechnicalMessage(trimmed) : trimmed;
}

/** Текст для баннера или подписи под полем: если есть ровно одна полевая ошибка — её. */
export function userErrorMessage(error: AppError): string {
  const values = error.fields ? Object.values(error.fields).filter(Boolean) : [];
  const only = values[0];
  if (values.length === 1 && only) {
    return only;
  }
  if (values.length > 1) {
    return humanizeErrorMessage(error.message) || VALIDATION_SUMMARY;
  }
  return humanizeErrorMessage(error.message);
}

export function toAppError(error: UnknownError): AppError {
  if (!error) {
    return { code: ErrorCode.Unknown, message: 'Неизвестная ошибка', retryable: false };
  }

  if (typeof error === 'object' && 'status' in error) {
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
      const details = error.data.error.details;
      const fields = fieldErrorsFromDetails(details);
      const rawMessage = error.data.error.message;
      return {
        code: error.data.error.code,
        message: humanizeErrorMessage(rawMessage),
        status,
        details,
        fields,
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

  const rawMessage =
    'message' in error && typeof error.message === 'string' ? error.message : undefined;
  const fields = rawMessage
    ? fieldErrorsFromDetails(rawMessage.split(';').map((part) => part.trim()))
    : undefined;

  return {
    code:
      ('code' in error && typeof error.code === 'string' ? error.code : undefined) ??
      ErrorCode.Unknown,
    message: humanizeErrorMessage(rawMessage ?? 'Неизвестная ошибка'),
    fields,
    retryable: false,
  };
}

export function isUnauthorized(error: UnknownError): boolean {
  return Boolean(error && typeof error === 'object' && 'status' in error && error.status === 401);
}
