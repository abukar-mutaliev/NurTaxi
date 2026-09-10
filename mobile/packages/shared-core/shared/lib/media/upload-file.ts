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

export interface UploadFileOptions {
  contentType: string;
  timeoutMs?: number;
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
      throw new Error(`Не удалось загрузить файл (${result.status})`);
    }
  } finally {
    clearTimeout(timer);
  }
}
