import { Global, Module } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';

/**
 * Приватное S3-хранилище документов и фото (Des §9, §3).
 */
@Global()
@Module({
  providers: [S3StorageService],
  exports: [S3StorageService],
})
export class StorageModule {}
