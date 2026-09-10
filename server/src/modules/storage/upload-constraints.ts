import { BadRequestException } from '@nestjs/common';

export const PHOTO_CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export const DOCUMENT_CONTENT_TYPE_EXT: Record<string, string> = {
  ...PHOTO_CONTENT_TYPE_EXT,
  'application/pdf': 'pdf',
};

export const AUDIO_CONTENT_TYPE_EXT: Record<string, string> = {
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/mpeg': 'mp3',
};

export const PHOTO_CONTENT_TYPES = Object.keys(PHOTO_CONTENT_TYPE_EXT);
export const DOCUMENT_CONTENT_TYPES = Object.keys(DOCUMENT_CONTENT_TYPE_EXT);
export const AUDIO_CONTENT_TYPES = Object.keys(AUDIO_CONTENT_TYPE_EXT);

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;

export function assertAllowedUpload(
  contentType: string,
  contentLength: number,
  allowed: readonly string[],
  maxBytes: number,
  typeHint: string,
): void {
  if (!allowed.includes(contentType)) {
    throw new BadRequestException({
      code: 'INVALID_CONTENT_TYPE',
      message: `Допустимы только ${typeHint}`,
    });
  }

  if (!Number.isInteger(contentLength) || contentLength < 1 || contentLength > maxBytes) {
    throw new BadRequestException({
      code: 'FILE_TOO_LARGE',
      message: `Файл больше ${Math.floor(maxBytes / (1024 * 1024))} МБ`,
    });
  }
}
