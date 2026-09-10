import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3Config } from '../../config/configuration';

export interface PresignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresInSec: number;
}

export interface PresignedDownload {
  downloadUrl: string;
  expiresInSec: number;
}

const UPLOAD_TTL_SEC = 900;
const DOWNLOAD_TTL_SEC = 300;

/** Частные сети: такой адрес недостижим ни для одного телефона за их пределами. */
const LAN_HOST = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
/** Сама машина. Локально это верное значение: телефон приходит через `adb reverse`. */
const LOOPBACK_HOST = /^(localhost$|127\.|0\.0\.0\.0$|::1$)/;

/**
 * Presigned URL открывает телефон, а не сервер, поэтому публичный адрес обязан быть виден
 * оттуда. Ошибка здесь не мешает ни запуску, ни разработке и всплывает только при загрузке
 * файла — минутой ожидания и невнятной ошибкой сети. Один такой случай уже стоил долгих
 * поисков: адрес указывал в домашнюю сеть разработчика, и загрузка не работала ни у кого.
 */
function warnIfUnreachable(logger: Logger, publicEndpoint: string, env: string): void {
  const host = ((): string => {
    try {
      return new URL(publicEndpoint).hostname;
    } catch {
      return '';
    }
  })();

  if (!host || !(LAN_HOST.test(host) || (env !== 'development' && LOOPBACK_HOST.test(host)))) {
    return;
  }

  logger.warn(
    `S3_PUBLIC_ENDPOINT=${publicEndpoint} — этот адрес виден только внутри своей сети. ` +
      'Ссылку на загрузку открывает телефон пользователя, поэтому загрузка файлов работать не будет. ' +
      'Укажите адрес хранилища, доступный извне.',
  );

  if (env === 'production') {
    throw new Error(
      `S3_PUBLIC_ENDPOINT указывает на недоступный извне адрес (${publicEndpoint}) — загрузка файлов работать не будет`,
    );
  }
}

/**
 * S3-совместимое хранилище с presigned URL (Des §9).
 * В dev работает с MinIO из docker-compose.
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;
  private bucketReady = false;

  constructor(private readonly config: ConfigService) {
    const s3 = this.config.getOrThrow<S3Config>('s3');
    this.bucket = s3.bucket;

    const clientConfig = {
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKey,
        secretAccessKey: s3.secretKey,
      },
      forcePathStyle: s3.forcePathStyle,
      // Без этого SDK v3 добавляет CRC32 в presigned URL — React Native PUT его не шлёт.
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };

    this.client = new S3Client({
      ...clientConfig,
      endpoint: s3.endpoint,
    });

    this.presignClient =
      s3.publicEndpoint === s3.endpoint
        ? this.client
        : new S3Client({
            ...clientConfig,
            endpoint: s3.publicEndpoint,
          });

    warnIfUnreachable(
      this.logger,
      s3.publicEndpoint,
      this.config.get<string>('app.env') ?? 'development',
    );
  }

  async ensureBucket(): Promise<void> {
    if (this.bucketReady) return;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.bucketReady = true;
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.bucketReady = true;
        this.logger.log(`Создан bucket "${this.bucket}"`);
      } catch (error) {
        this.logger.warn(`S3 bucket "${this.bucket}" недоступен — presigned URL могут не работать`);
        this.logger.debug(error);
      }
    }
  }

  buildDriverDocumentKey(driverId: string, documentType: string, extension: string): string {
    const safeExt = extension.replace(/^\./, '').toLowerCase();
    return `drivers/${driverId}/${documentType}/${Date.now()}.${safeExt}`;
  }

  buildUserPhotoKey(userId: string, extension: string): string {
    const safeExt = extension.replace(/^\./, '').toLowerCase();
    return `users/${userId}/photo/${Date.now()}.${safeExt}`;
  }

  buildTripRecordingKey(orderId: string, clientId: string, extension: string): string {
    const safeExt = extension.replace(/^\./, '').toLowerCase();
    return `orders/${orderId}/recordings/${clientId}/${Date.now()}.${safeExt}`;
  }

  async createUploadUrl(
    storageKey: string,
    contentType: string,
    expiresInSec = UPLOAD_TTL_SEC,
  ): Promise<PresignedUpload> {
    await this.ensureBucket();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.presignClient, command, { expiresIn: expiresInSec });

    return { uploadUrl, storageKey, expiresInSec };
  }

  async createDownloadUrl(
    storageKey: string,
    expiresInSec = DOWNLOAD_TTL_SEC,
  ): Promise<PresignedDownload> {
    await this.ensureBucket();

    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    const downloadUrl = await getSignedUrl(this.presignClient, command, {
      expiresIn: expiresInSec,
    });

    return { downloadUrl, expiresInSec };
  }
}
