import { BadRequestException } from '@nestjs/common';
import {
  assertAllowedUpload,
  DOCUMENT_CONTENT_TYPES,
  DOCUMENT_MAX_BYTES,
  PHOTO_CONTENT_TYPES,
  PHOTO_MAX_BYTES,
} from './upload-constraints';

describe('assertAllowedUpload', () => {
  it('принимает jpeg в пределах лимита', () => {
    expect(() =>
      assertAllowedUpload('image/jpeg', 1024, PHOTO_CONTENT_TYPES, PHOTO_MAX_BYTES, 'JPEG'),
    ).not.toThrow();
  });

  it('отклоняет произвольный content-type', () => {
    expect(() =>
      assertAllowedUpload(
        'application/octet-stream',
        1024,
        DOCUMENT_CONTENT_TYPES,
        DOCUMENT_MAX_BYTES,
        'JPEG, PNG, WebP, HEIC и PDF',
      ),
    ).toThrow(BadRequestException);
  });

  it('отклоняет файл больше лимита', () => {
    expect(() =>
      assertAllowedUpload(
        'image/jpeg',
        PHOTO_MAX_BYTES + 1,
        PHOTO_CONTENT_TYPES,
        PHOTO_MAX_BYTES,
        'JPEG',
      ),
    ).toThrow(BadRequestException);
  });
});
