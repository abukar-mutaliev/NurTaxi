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

/**
 * S3-совместимое хранилище с presigned URL (Des §9).
 * В dev работает с MinIO из docker-compose.
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private bucketReady = false;

  constructor(private readonly config: ConfigService) {
    const s3 = this.config.getOrThrow<S3Config>('s3');
    this.bucket = s3.bucket;
    this.client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKey,
        secretAccessKey: s3.secretKey,
      },
      forcePathStyle: s3.forcePathStyle,
    });
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

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSec });

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

    const downloadUrl = await getSignedUrl(this.client, command, { expiresIn: expiresInSec });

    return { downloadUrl, expiresInSec };
  }
}
