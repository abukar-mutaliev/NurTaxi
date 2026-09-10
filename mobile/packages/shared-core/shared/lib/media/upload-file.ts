/**
 * Загрузка файла в S3 по presigned URL с ограничением по времени.
 *
 * `FileSystem.uploadAsync` таймаута не поддерживает, поэтому недоступное хранилище держит
 * экран в состоянии «Загрузка…» до системного таймаута сокета — около минуты, без единого
 * намёка на причину. Так было с неверным публичным адресом MinIO: приложение выглядело
 * зависшим, хотя ошибка была известна серверу сразу.
 *
 * Через `createUploadTask` задачу можно отменить, поэтому ждём её наперегонки с таймером
 * и на срабатывание отменяем — иначе отсчёт продолжался бы в фоне.
 */
import * as FileSystem from 'expo-file-system/legacy';

/** Столько ждём загрузку одного файла. Документы водителя — это фото на несколько мегабайт. */
export const UPLOAD_TIMEOUT_MS = 30_000;

export class UploadTimeoutError extends Error {
  constructor() {
    super('Хранилище не отвечает. Проверьте соединение и попробуйте ещё раз.');
    this.name = 'UploadTimeoutError';
  }
}

function toUploadFailure(cause: unknown): Error {
  if (cause instanceof Error && cause.name === 'UploadTimeoutError') {
    return cause;
  }
  const raw = cause instanceof Error ? cause.message : String(cause);
  if (/CLEARTEXT|network security policy/i.test(raw)) {
    return new Error(
      'Не удалось отправить файл. Проверьте подключение к сети и попробуйте ещё раз.',
    );
  }
  if (/Network request failed|failed to connect|ECONNREFUSED|timed out/i.test(raw)) {
    return new Error('Не удалось отправить файл. Проверьте соединение и попробуйте ещё раз.');
  }
  if (cause instanceof Error && cause.message && !/status\s*\d+/i.test(cause.message)) {
    return cause;
  }
  return new Error('Не удалось загрузить файл. Попробуйте другое фото или повторите попытку.');
}

export interface UploadFileOptions {
  contentType: string;
  timeoutMs?: number;
}

export async function getLocalFileSize(uri: string, reported?: number | null): Promise<number> {
  if (typeof reported === 'number' && reported > 0) {
    return reported;
  }
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > 0) {
    return info.size;
  }
  throw new Error('Не удалось определить размер файла');
}

/**
 * Кладёт файл по presigned URL методом PUT.
 * Бросает `UploadTimeoutError` по истечении времени и обычную ошибку на не-2xx ответ.
 */
export async function uploadFileToStorage(
  uploadUrl: string,
  fileUri: string,
  { contentType, timeoutMs = UPLOAD_TIMEOUT_MS }: UploadFileOptions,
): Promise<void> {
  const task = FileSystem.createUploadTask(uploadUrl, fileUri, {
    headers: { 'Content-Type': contentType },
    httpMethod: 'PUT',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Отмена асинхронна, но ждать её нечего: экран уже получил отказ.
      void task.cancelAsync().catch(() => undefined);
      reject(new UploadTimeoutError());
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([task.uploadAsync(), expired]);

    // `uploadAsync` возвращает undefined, если задачу отменили — таймер уже бросил ошибку.
    if (!result) {
      throw new UploadTimeoutError();
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error('Не удалось загрузить файл. Попробуйте другое фото или повторите попытку.');
    }
  } catch (cause) {
    if (cause instanceof UploadTimeoutError) {
      throw cause;
    }
    throw toUploadFailure(cause);
  } finally {
    clearTimeout(timer);
  }
}
